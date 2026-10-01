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

## Pontos de atenção
- **Backup:** o serviço `backup` do leilao-finder-buddy faz `pg_dump` só do banco dele. O banco
  `agendaboa` **não** está coberto até alguém criar um backup próprio.
- **Recursos compartilhados:** a instância Postgres (512 MB) agora atende dois apps; `CONNECTION LIMIT 10`
  no role e `max: 5` no pool limitam o impacto. Uma queda do Postgres derruba os dois.
- **Superusuário:** o superusuário da instância enxerga todos os bancos; o isolamento entre apps é por
  role/banco, não criptográfico.
