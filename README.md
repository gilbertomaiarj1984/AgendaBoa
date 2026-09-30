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

## Notas
- A lista é verificada no login (`auth.ts`). A sessão é JWT; remover um e-mail só bloqueia novos logins, sessões ativas valem até expirar.
- Os compromissos ficam no Postgres (tabela `events`, criada automaticamente, filtrada pelo e-mail do usuário logado).
- O service worker só cacheia assets estáticos; páginas autenticadas nunca vão para o cache.

## Deploy na VPS (isolado)
Segue o modelo de infra da VPS (Caddy compartilhado + Postgres compartilhado com banco/role próprios).
Passo a passo e decisões manuais em **`infra/README.md`**. Regras de isolamento para as sessões: `CLAUDE.md`.
