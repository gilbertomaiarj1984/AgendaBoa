# AgendaBoa — regras do projeto

## Isolamento (regra inviolável)
Este app roda numa VPS compartilhada com outros projetos independentes (pdf-unite-and-print, leilao-finder-buddy).
- Esta sessão trata **somente** o AgendaBoa. Nunca ler, alterar, reiniciar ou executar comandos em outras aplicações, seus repositórios, containers, redes, volumes, portas, vhosts, crons ou arquivos na VPS.
- Nunca usar comandos globais que afetem tudo: `docker system prune`, `docker stop $(docker ps -q)`, `docker compose down` fora desta pasta, `pkill`/`killall` genéricos, `systemctl restart nginx/caddy` sem pedido explícito, alterações em firewall.
- Tudo do AgendaBoa usa prefixo próprio: projeto compose `agendaboa`, container `agendaboa-app`, rede `agendaboa_net`, pasta própria na VPS, `.env.production` próprio, porta própria (`AGENDABOA_PORT`, padrão 3417, só em 127.0.0.1).
- Antes de escolher porta/domínio, conferir com o usuário que não conflita; nunca "liberar" uma porta matando o processo de outro app.
- Mudança no proxy reverso compartilhado (nginx/caddy/traefik) só com autorização explícita do usuário, adicionando apenas um vhost/arquivo novo do AgendaBoa, sem editar os existentes.
- Segredos (`AUTH_*`, `ALLOWED_EMAILS`) são exclusivos deste app; não reutilizar credenciais OAuth nem `.env` de outros projetos.

## Stack
Next.js 16 + Auth.js v5 (Google), PWA. Login restrito por `ALLOWED_EMAILS` (`auth.ts`).
