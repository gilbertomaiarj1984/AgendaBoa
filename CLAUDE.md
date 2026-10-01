# AgendaBoa — regras do projeto

## Isolamento (regra inviolável)
Este app roda numa VPS compartilhada com outros projetos independentes (pdf-unite-and-print, leilao-finder-buddy).
- Esta sessão trata **somente** o AgendaBoa. Nunca ler, alterar, reiniciar ou executar comandos em outras aplicações, seus repositórios, containers, redes, volumes, portas, vhosts, crons ou arquivos na VPS.
- Nunca usar comandos globais que afetem tudo: `docker system prune`, `docker stop $(docker ps -q)`, `docker compose down` fora desta pasta, `pkill`/`killall` genéricos, `systemctl restart nginx/caddy` sem pedido explícito, alterações em firewall.
- Tudo do AgendaBoa usa prefixo próprio: projeto compose `agendaboa`, container `agendaboa-app`, rede `agendaboa_db`, pasta própria na VPS, `.env.production` próprio, banco e role `agendaboa` no Postgres compartilhado. Sem portas publicadas (roteado pelo Caddy via rede `proxy`).
- Postgres compartilhado: usar apenas o banco/role `agendaboa`. Nunca consultar, alterar ou dar dump nos bancos de outros apps. Mudanças em recursos compartilhados (Postgres, Caddy, redes) são passos manuais do dono, documentados em `infra/`.
- Ler o repositório de outro app (ex.: para copiar o modelo de infra) só quando o usuário pedir, somente leitura.
- Antes de escolher porta/domínio, conferir com o usuário que não conflita; nunca "liberar" uma porta matando o processo de outro app.
- Mudança no proxy reverso compartilhado (nginx/caddy/traefik) só com autorização explícita do usuário, adicionando apenas um vhost/arquivo novo do AgendaBoa, sem editar os existentes.
- Segredos (`AUTH_*`, `ALLOWED_EMAILS`) são exclusivos deste app; não reutilizar credenciais OAuth nem `.env` de outros projetos.

## Stack
Next.js 16 + Auth.js v5 (Google), PWA. Login restrito por `ALLOWED_EMAILS` (`auth.ts`).

## Convenções do app
- Agenda **compartilhada**: `events.owner_email` é quem adicionou (cor do ícone), nunca filtro de visibilidade. Acesso = `isAllowedEmail` (`auth.ts`) em toda ação/rota.
- Versão = `package.json` (subir no PR de cada mudança). Commit/data do build entram em `next.config.ts` via `GIT_SHA`.
- Fotos: JPEG comprimido no cliente (`lib/image.ts`), guardado em `event_images`; o servidor valida tipo e tamanho (700 KB).
