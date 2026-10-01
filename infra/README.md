# Infra do AgendaBoa na VPS

Modelo copiado do `leilao-finder-buddy` (leitura somente): um Caddy compartilhado faz TLS e roteia por
domínio pela rede Docker externa `proxy`; apps não publicam portas; o Postgres é **uma instância só,
com banco e role separados por app**.

## Princípio de isolamento
Nada aqui altera arquivos, compose, containers ou bancos de outro app. Os passos abaixo que tocam em
recursos compartilhados (Postgres, Caddy) são **manuais e de decisão do dono da VPS**.

## Etapas (uma vez)
1. **Banco/role próprios** — rodar `infra/provision-db.sql` como superusuário da instância Postgres.
2. **Rede dedicada ao banco** — o Postgres hoje só está na rede interna do leilao-finder-buddy, e o
   AgendaBoa não deve entrar nela. Criar uma rede só para esta ligação:
   ```bash
   docker network create agendaboa_db
   docker network connect --alias agendaboa-postgres agendaboa_db <container-do-postgres>
   ```
   `connect` é aditivo e sem downtime, mas **não persiste** se o container do Postgres for recriado
   (`compose up` com mudança de config). Para persistir, o compose do Postgres precisa declarar a rede
   `agendaboa_db` como externa — é edição no projeto do outro app, então só você decide.
3. **Rede `proxy`** já existe (criada para o Caddy). O AgendaBoa entra nela com o alias `agendaboa-app`.
4. **Caddy** — acrescentar o bloco de `infra/Caddyfile.snippet` ao Caddyfile existente e recarregar o Caddy.
5. **Google OAuth** — novo ID de cliente; redirect URI `https://<dominio>/api/auth/callback/google`.
6. **Deploy** — pasta exclusiva, `.env.production` (chmod 600) a partir de `.env.example`, então
   `docker compose pull && docker compose up -d`. A imagem é buildada no GitHub Actions (`.github/workflows/build.yml`) e publicada no GHCR; a VPS nunca builda. Só afeta o projeto compose `agendaboa`.

## Deploy automático (GitHub Actions → VPS)
Depois que o PR é mesclado e o build da `main` fica verde, o job `deploy` (`.github/workflows/build.yml`) entra na VPS por SSH,
roda `docker compose pull && docker compose up -d` na pasta do app e confere se o rodapé do site mostra o commit novo.
Sem os segredos abaixo o job só avisa que está desligado e termina sem erro. Faça uma vez:

1. **Gerar a chave (exclusiva do deploy)** — no seu computador:
   ```bash
   ssh-keygen -t ed25519 -f agendaboa_deploy -N "" -C agendaboa-deploy
   ```
   Cria `agendaboa_deploy` (privada, vai para o GitHub) e `agendaboa_deploy.pub` (pública, vai para a VPS).
2. **Autorizar na VPS, com restrição** — no usuário que roda o compose do AgendaBoa, acrescente UMA linha em `~/.ssh/authorized_keys`
   (troque o final pelo conteúdo do `agendaboa_deploy.pub`):
   ```
   command="cd /opt/agendaboa && docker compose pull && docker compose up -d",restrict ssh-ed25519 AAAA...resto... agendaboa-deploy
   ```
   Com `command=` e `restrict`, essa chave só consegue rodar esse comando (nem terminal, nem outros comandos). Isso importa porque
   quem usa docker na VPS tem poder de root; se a chave vazar, ela não abre a VPS compartilhada com os outros apps.
3. **Impressão digital do servidor** — para o GitHub só conectar na VPS verdadeira:
   ```bash
   ssh-keyscan -t ed25519 IP_OU_DOMINIO_DA_VPS
   ```
   Copie a saída inteira (uma linha começando pelo endereço).
4. **Cadastrar no GitHub** — repositório → *Settings* → *Secrets and variables* → *Actions* → aba **Secrets** → *New repository secret*:

   | Nome | O que colocar |
   |---|---|
   | `VPS_HOST` | IP ou domínio da VPS |
   | `VPS_USER` | usuário SSH da VPS (o do passo 2) |
   | `VPS_SSH_KEY` | conteúdo completo do arquivo `agendaboa_deploy` (com as linhas `BEGIN`/`END`) |
   | `VPS_KNOWN_HOSTS` | a saída do `ssh-keyscan` (passo 3) |

   Opcional, na aba **Variables**: `VPS_PORT` (padrão `22`), `VPS_APP_DIR` (padrão `/opt/agendaboa`) e `APP_URL` (padrão o domínio do `.env.example`).
5. **Apagar a chave privada** do seu computador depois de colá-la no GitHub, e testar em *Actions* → *build* → *Run workflow* (na `main`).
   O último passo do job deve dizer `No ar: ... mostra o build <commit>`.

Observações:
- O deploy só atualiza a **imagem**. Mudanças em `docker-compose.yml` ou `infra/` precisam ser copiadas para a VPS (continua sendo passo manual).
- Se o último passo falhar (o site não mostrou o commit novo em 3 min), o workflow fica vermelho e o GitHub avisa por e-mail. A VPS não volta
  sozinha para a versão anterior: veja `docker compose logs --tail 50 app` e, se precisar, volte com
  `APP_IMAGE=ghcr.io/gilbertomaiarj1984/agendaboa:<commit-anterior> docker compose up -d`.
- Imagens antigas ocupam disco: liste com `docker images ghcr.io/gilbertomaiarj1984/agendaboa` e remova só as deste repositório com `docker image rm`
  (nunca `docker system prune`, que alcança os outros apps).

## Pontos de atenção
- **Backup:** o serviço `backup` do AgendaBoa (`infra/backup.sh`) faz `pg_dump` só do banco `agendaboa`,
  1x/dia, para o volume Docker `agendaboa_backups`, com retenção de 14 dias. O backup do leilão-finder-buddy
  não cobre este banco. Os dumps ficam no MESMO disco da VPS: protegem contra erro de aplicação/dado, não
  contra perda do servidor — copiar periodicamente para fora (ex.: bucket próprio, nunca o do leilão).
- **Recursos compartilhados:** a instância Postgres (512 MB) agora atende dois apps; `CONNECTION LIMIT 10`
  no role e `max: 5` no pool limitam o impacto. Uma queda do Postgres derruba os dois.
- **Superusuário:** o superusuário da instância enxerga todos os bancos; o isolamento entre apps é por
  role/banco, não criptográfico.

## Persistência das ligações (importante)
O deploy do leilão-finder-buddy copia o `Caddyfile` e o `docker-compose.yml` do repositório dele por cima
dos da VPS a cada push. Por isso o bloco do AgendaBoa e a rede `agendaboa_db` precisam estar **nesse
repositório**: `infra/leilao-agendaboa.patch` contém exatamente essas duas mudanças
(`git apply infra/leilao-agendaboa.patch` na raiz do repo do leilão; é um patch pequeno e revisável).
Sem ele, depois de um deploy do leilão o AgendaBoa pode ficar fora do ar até repetir os passos manuais.

`bash infra/check.sh` verifica (somente leitura) se as ligações continuam de pé.

## Limites que protegem os outros apps
- Container: 256 MB, 0,5 CPU, 200 processos, logs com teto de 30 MB.
- Postgres: role com no máximo 10 conexões, pool de 5, `statement_timeout` de 10 s.
- Build da imagem só no GitHub Actions; a VPS apenas baixa a imagem.

## Backup: operação
```bash
cd /opt/agendaboa
docker compose logs --tail 20 backup                          # último dump
docker compose exec backup ls -l /backups                     # arquivos
# restaurar num banco VAZIO do role agendaboa (ex.: após recriar o banco):
docker compose exec backup sh -c 'gunzip -c /backups/agendaboa-XXXX.sql.gz | psql "$DATABASE_URL"'
```

## Migração do esquema (app v0.2.0)
Não há passo manual: no primeiro acesso depois do deploy, `ensureSchema()` (`lib/db.ts`) acrescenta à tabela `events` as colunas
`end_time`, `end_date`, `type`, `updated_at`, `updated_by` e cria `event_images`. É aditivo e idempotente; o role `agendaboa`
é dono das tabelas, então não precisa de privilégio extra. Faça um dump (`infra/backup.sh`) antes do primeiro deploy se quiser um ponto de retorno.
As fotos ocupam o mesmo banco: o dump diário já as inclui (cada foto tem no máximo 700 KB).
