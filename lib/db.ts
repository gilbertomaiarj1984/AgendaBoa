import postgres from "postgres";

// Conexão única por processo. DATABASE_URL aponta para o banco/role PRÓPRIOS do AgendaBoa
// na instância Postgres compartilhada da VPS (ver infra/README.md) — nunca para o banco
// de outra aplicação.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql; schemaReady?: Promise<void> };

export const sql =
  globalForDb.sql ??
  (globalForDb.sql = postgres(process.env.DATABASE_URL ?? "", { max: 5, idle_timeout: 20 }));

// Idempotente (tudo IF NOT EXISTS), no mesmo estilo do setup.sql do leilao-finder-buddy.
export function ensureSchema(): Promise<void> {
  return (globalForDb.schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_email text NOT NULL,
        title       text NOT NULL,
        date        date NOT NULL,
        time        time NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now()
      )`;
    await sql`CREATE INDEX IF NOT EXISTS events_owner_when_idx ON events (owner_email, date, time)`;
  })().catch((e) => {
    globalForDb.schemaReady = undefined;
    throw e;
  }));
}
