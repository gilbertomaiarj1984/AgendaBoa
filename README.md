# AgendaBoa

Agenda PWA (Next.js + Auth.js) com login Google restrito a e-mails liberados.

## Configuração
1. `cp .env.example .env.local` e preencha:
   - `AUTH_SECRET`: `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google Cloud Console → Credenciais → ID do cliente OAuth (Aplicativo da Web).
     URI de redirecionamento: `http://localhost:3000/api/auth/callback/google` (e a URL de produção equivalente).
   - `ALLOWED_EMAILS`: e-mails liberados, separados por vírgula.
2. `npm install && npm run dev`

Em produção, defina as mesmas variáveis como secrets da plataforma (e `AUTH_URL`/`AUTH_TRUST_HOST` se necessário).
Para liberar/bloquear alguém, edite `ALLOWED_EMAILS` e reinicie/redeploy.

## Como funciona
- **Calendário:** visões Semana (segunda a sexta + sábado e domingo em dois quadros), 2 semanas e Mês. O app abre na última visão usada naquele aparelho. Tocar num dia abre o card dele, com o horário atual, o próximo compromisso e o botão **+**.
- **Itens compartilhados:** as pessoas liberadas em `ALLOWED_EMAILS` veem e editam os mesmos itens. Excluir pede confirmação. O ícone de quem adicionou é azul (Gilberto) ou rosa (Jacheline); nome e cor ficam em `lib/users.ts`.
- **Tipos:** Escolar (amarelo), Corrida (vermelho) e Outros (sem cor), escolhidos ao criar o item.
- **Vários dias:** um item pode ir da data X até a data Y; a hora de início vale na data X e a hora de fim na data Y.
- **Foto:** capturada pela câmera do celular, comprimida no aparelho (lado maior 1280 px, JPEG) e guardada no Postgres (tabela `event_images`, servida por `/api/events/<id>/image` só para pessoas liberadas).
- **Agenda escolar:** ícone no topo; tabela fixa de aulas da Julia (horário × dia da semana × matéria, sem datas) em `lib/escola.ts`.
- **Versão no rodapé:** barra fixa com a versão que está no ar (veja abaixo).

## Versão
A versão é a do `package.json`, e é a única fonte. O rodapé mostra `v<versão>`, o commit do build e a data do build (horário de Brasília).
Para publicar uma versão nova, suba a versão no mesmo PR da mudança: `npm version patch --no-git-tag-version` (ou `minor`/`major`).
O commit entra pelo build-arg `GIT_SHA` (GitHub Actions, `.github/workflows/build.yml`); localmente aparece `build local`.

## Notas
- A lista é verificada no login (`auth.ts`) e também a cada ação no servidor: remover um e-mail de `ALLOWED_EMAILS` corta o acesso aos dados na hora, mesmo com a sessão (JWT) ainda válida.
- Os dados ficam no Postgres. O esquema (`lib/db.ts`) é criado e migrado sozinho (tudo `IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS`); itens da versão antiga ganham fim = início + 1h e terminam no mesmo dia.
- O service worker só cacheia assets estáticos; páginas autenticadas nunca vão para o cache.

## Deploy na VPS (isolado)
Segue o modelo de infra da VPS (Caddy compartilhado + Postgres compartilhado com banco/role próprios).
Passo a passo e decisões manuais em **`infra/README.md`**. Regras de isolamento para as sessões: `CLAUDE.md`.
