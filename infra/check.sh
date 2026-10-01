#!/usr/bin/env bash
# Verificação SOMENTE LEITURA das ligações do AgendaBoa com recursos compartilhados da VPS.
# Rode depois de qualquer deploy dos outros apps. Não altera nada; só diz o que falta.
# Uso: bash infra/check.sh   (ajuste PG/CADDY se os nomes dos containers mudarem)
PG="${PG:-garimpo-postgres-1}"
CADDY="${CADDY:-garimpo-caddy-1}"
DOMAIN="${DOMAIN:-agenda.143-95-214-240.sslip.io}"
ok() { echo "OK   $*"; }
bad() { echo "FALHA $*"; rc=1; }
rc=0

if docker inspect "$PG" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null | grep -qw agendaboa_db; then
  ok "Postgres está na rede agendaboa_db"
else
  bad "Postgres fora da rede agendaboa_db -> docker network connect --alias agendaboa-postgres agendaboa_db $PG"
fi

if docker exec "$CADDY" grep -q "$DOMAIN" /etc/caddy/Caddyfile 2>/dev/null; then
  ok "Caddyfile tem o bloco de $DOMAIN"
else
  bad "Caddyfile sem o bloco de $DOMAIN (um deploy do leilão pode ter sobrescrito) -> aplicar infra/leilao-agendaboa.patch no repositório do leilão"
fi

state=$(docker inspect agendaboa-app --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' 2>/dev/null)
case "$state" in
  "running healthy"*|"running ") ok "agendaboa-app: $state" ;;
  *) bad "agendaboa-app: ${state:-ausente}" ;;
esac

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/login")
[ "$code" = "200" ] && ok "https://$DOMAIN/login -> 200" || bad "https://$DOMAIN/login -> $code"
exit $rc
