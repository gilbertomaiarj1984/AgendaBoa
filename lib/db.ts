import postgres from "postgres";

// Conexão única por processo. DATABASE_URL aponta para o banco/role PRÓPRIOS do AgendaBoa
// na instância Postgres compartilhada da VPS (ver infra/README.md) — nunca para o banco
// de outra aplicação.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql; schemaReady?: Promise<void> };

export const sql =
  globalForDb.sql ??
  (globalForDb.sql = postgres(process.env.DATABASE_URL ?? "", { max: 5, idle_timeout: 20 }));

// Idempotente (tudo IF NOT EXISTS), no mesmo estilo do setup.sql do leilao-finder-buddy.
// A agenda é compartilhada entre as pessoas liberadas: `owner_email` é quem ADICIONOU o item (define a cor
// do ícone), não um filtro de visibilidade. A coluna `time` é a hora de início e `date` o dia de início.
// A tabela `events` já existia (versão antiga, só com hora de início): as colunas novas entram por ALTER.
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
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time time`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by text`;
    // Itens antigos não tinham fim: assume 1h (limitado a 23:59).
    await sql`
      UPDATE events
      SET end_time = CASE WHEN time >= time '23:00' THEN time '23:59' ELSE time + interval '1 hour' END
      WHERE end_time IS NULL`;
    await sql`ALTER TABLE events ALTER COLUMN end_time SET NOT NULL`;
    // Compromisso de vários dias: `date` + `time` = começo, `end_date` + `end_time` = fim. Itens antigos terminam no mesmo dia.
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date date`;
    await sql`UPDATE events SET end_date = date WHERE end_date IS NULL`;
    await sql`ALTER TABLE events ALTER COLUMN end_date SET NOT NULL`;
    // Tipo: 'escolar' (amarelo), 'corrida' (vermelho) ou 'outros' (sem cor). Validado no app.
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'outros'`;
    await sql`CREATE INDEX IF NOT EXISTS events_date_time_idx ON events (date, time)`;
    // Foto (já comprimida no celular, JPEG) fica em tabela própria para a listagem nunca carregar bytes de imagem.
    await sql`
      CREATE TABLE IF NOT EXISTS event_images (
        event_id     uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
        data         bytea NOT NULL,
        content_type text NOT NULL DEFAULT 'image/jpeg',
        created_at   timestamptz NOT NULL DEFAULT now()
      )`;
  })().catch((e) => {
    globalForDb.schemaReady = undefined;
    throw e;
  }));
}
