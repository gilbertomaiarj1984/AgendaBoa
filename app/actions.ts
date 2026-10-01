"use server";

import { auth, isAllowedEmail } from "@/auth";
import { ensureSchema, sql } from "@/lib/db";
import type { EventInput, EventItem, EventType, Result } from "@/lib/types";
import { isDateKey, validateInput } from "@/lib/validate";

// O cliente comprime a foto antes de enviar; o servidor só confere formato e tamanho.
const MAX_PHOTO_BYTES = 700 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = { id: string; title: string; type: EventType; date: string; endDate: string; start: string; end: string; owner: string; hasImage: boolean; v: number };

const COLS = sql`e.id, e.title, e.type, e.date::text AS date, e.end_date::text AS "endDate",
           to_char(e.time, 'HH24:MI') AS start, to_char(e.end_time, 'HH24:MI') AS "end",
           e.owner_email AS owner, (i.event_id IS NOT NULL) AS "hasImage",
           (extract(epoch FROM e.updated_at) * 1000)::float8 AS v`;

async function requireEmail(): Promise<string> {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email || !isAllowedEmail(email)) throw new Error("Não autorizado");
  await ensureSchema();
  return email;
}

function toItem(r: Row): EventItem {
  return { ...r, v: Math.round(Number(r.v)) };
}

function decodePhoto(dataUrl: string): Buffer {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Foto inválida");
  const buf = Buffer.from(m[1], "base64");
  const isJpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg || buf.length > MAX_PHOTO_BYTES) throw new Error("Foto inválida");
  return buf;
}

async function getEvent(id: string): Promise<EventItem | null> {
  const rows = await sql<Row[]>`
    SELECT ${COLS}
    FROM events e LEFT JOIN event_images i ON i.event_id = e.id
    WHERE e.id = ${id}`;
  return rows[0] ? toItem(rows[0]) : null;
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  console.error("[agenda]", e);
  return { ok: false, error: fallback };
}

/** Itens de todas as pessoas liberadas entre duas datas (inclusive). Não traz bytes de foto. */
export async function listEvents(from: string, to: string): Promise<Result<EventItem[]>> {
  try {
    await requireEmail();
    if (!isDateKey(from) || !isDateKey(to)) return { ok: false, error: "Período inválido." };
    // Traz também os itens que começaram antes do período e ainda estão em andamento nele.
    const rows = await sql<Row[]>`
      SELECT ${COLS}
      FROM events e LEFT JOIN event_images i ON i.event_id = e.id
      WHERE e.date <= ${to} AND e.end_date >= ${from}
      ORDER BY e.date, e.time, e.created_at`;
    return { ok: true, data: rows.map(toItem) };
  } catch (e) {
    return fail(e, "Não foi possível carregar a agenda.");
  }
}

export async function createEvent(input: EventInput, photo: string | null): Promise<Result<EventItem>> {
  try {
    const email = await requireEmail();
    const invalid = validateInput(input);
    if (invalid) return { ok: false, error: invalid };
    const img = photo ? decodePhoto(photo) : null;
    const id = await sql.begin(async (tx) => {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO events (owner_email, title, type, date, end_date, time, end_time, updated_by)
        VALUES (${email}, ${input.title.trim()}, ${input.type}, ${input.date}, ${input.endDate}, ${input.start}, ${input.end}, ${email})
        RETURNING id`;
      if (img) await tx`INSERT INTO event_images (event_id, data) VALUES (${row.id}, ${img})`;
      return row.id;
    });
    const item = await getEvent(id);
    return item ? { ok: true, data: item } : { ok: false, error: "Item não encontrado." };
  } catch (e) {
    return fail(e, "Não foi possível salvar o item. Tente de novo.");
  }
}

/** photo: undefined mantém a foto atual, null remove, string (JPEG em data URL) substitui. */
export async function updateEvent(id: string, input: EventInput, photo: string | null | undefined): Promise<Result<EventItem>> {
  try {
    const email = await requireEmail();
    if (!UUID_RE.test(id)) return { ok: false, error: "Item não encontrado." };
    const invalid = validateInput(input);
    if (invalid) return { ok: false, error: invalid };
    const img = typeof photo === "string" ? decodePhoto(photo) : null;
    const found = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`
        UPDATE events
        SET title = ${input.title.trim()}, type = ${input.type}, date = ${input.date}, end_date = ${input.endDate},
            time = ${input.start}, end_time = ${input.end},
            updated_at = now(), updated_by = ${email}
        WHERE id = ${id} RETURNING id`;
      if (!rows.length) return false;
      if (photo === null) await tx`DELETE FROM event_images WHERE event_id = ${id}`;
      else if (img) {
        await tx`INSERT INTO event_images (event_id, data) VALUES (${id}, ${img})
                 ON CONFLICT (event_id) DO UPDATE SET data = EXCLUDED.data, created_at = now()`;
      }
      return true;
    });
    if (!found) return { ok: false, error: "Este item não existe mais. Ele pode ter sido excluído." };
    const item = await getEvent(id);
    return item ? { ok: true, data: item } : { ok: false, error: "Item não encontrado." };
  } catch (e) {
    return fail(e, "Não foi possível salvar o item. Tente de novo.");
  }
}

export async function deleteEvent(id: string): Promise<Result<null>> {
  try {
    await requireEmail();
    if (!UUID_RE.test(id)) return { ok: false, error: "Item não encontrado." };
    await sql`DELETE FROM events WHERE id = ${id}`; // a foto some junto (ON DELETE CASCADE)
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "Não foi possível excluir o item. Tente de novo.");
  }
}
