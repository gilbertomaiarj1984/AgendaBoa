import { auth, isAllowedEmail } from "@/auth";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Foto de um item. Só para pessoas liberadas. A URL leva ?v=<versão>, então o navegador pode guardar a
// resposta para sempre: trocar a foto muda a versão e, com ela, a URL.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const email = (await auth())?.user?.email;
  if (!isAllowedEmail(email)) return new Response("Não autorizado", { status: 401 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response("Não encontrado", { status: 404 });
  await ensureSchema();
  const rows = await sql<{ data: Buffer; content_type: string }[]>`
    SELECT data, content_type FROM event_images WHERE event_id = ${id}`;
  if (!rows.length) return new Response("Não encontrado", { status: 404 });
  return new Response(new Uint8Array(rows[0].data), {
    headers: {
      "Content-Type": rows[0].content_type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
