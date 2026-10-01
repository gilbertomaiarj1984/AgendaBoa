#!/bin/sh
# Backup próprio do banco `agendaboa` (e só dele). Roda dentro de postgres:17-alpine, conectando
# com o role `agendaboa` via DATABASE_URL (a mesma do app). Grava dumps comprimidos no volume
# `backups`, com retenção local; nunca toca em outros bancos nem em arquivos fora de $BACKUP_DIR.
# BACKUP_ONCE=1 faz um único dump e sai (usado em teste).
set -eu

: "${DATABASE_URL:?defina DATABASE_URL}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_INTERVAL_HOURS:=24}"
: "${BACKUP_RETENTION_DAYS:=14}"

# O role tem statement_timeout curto para proteger o Postgres compartilhado; o dump é
# uma única operação mais longa, então desliga o limite só nesta sessão.
export PGOPTIONS="-c statement_timeout=0"

dump_once() {
  ts="$(date -u +%Y%m%dT%H%M%SZ)"
  tmp="$BACKUP_DIR/.agendaboa-$ts.sql.gz.part"
  out="$BACKUP_DIR/agendaboa-$ts.sql.gz"
  trap 'rm -f "$tmp"' EXIT
  echo "[backup] iniciando $ts"
  pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip -9 > "$tmp"
  gzip -t "$tmp"
  mv "$tmp" "$out"
  trap - EXIT
  echo "[backup] ok $(basename "$out") ($(wc -c < "$out") bytes)"
  # Retenção: só arquivos agendaboa-*.sql.gz deste diretório.
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'agendaboa-*.sql.gz' -mtime "+$BACKUP_RETENTION_DAYS" -print -delete
}

mkdir -p "$BACKUP_DIR"
while true; do
  dump_once || echo "[backup] FALHOU; tenta de novo no próximo ciclo" >&2
  [ "${BACKUP_ONCE:-0}" = "1" ] && exit 0
  sleep "$((BACKUP_INTERVAL_HOURS * 3600))"
done
