"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ensureSchema, sql } from "@/lib/db";

export type EventItem = { id: string; title: string; date: string; time: string };

async function requireEmail(): Promise<string> {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) throw new Error("Não autenticado");
  return email;
}

export async function listEvents(): Promise<EventItem[]> {
  const email = await requireEmail();
  await ensureSchema();
  return sql<EventItem[]>`
    SELECT id, title, date::text AS date, to_char(time, 'HH24:MI') AS time
    FROM events WHERE owner_email = ${email} ORDER BY date, time`;
}

export async function addEvent(input: { title: string; date: string; time: string }) {
  const email = await requireEmail();
  const title = input.title.trim().slice(0, 200);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error("Dados inválidos");
  }
  await ensureSchema();
  await sql`INSERT INTO events (owner_email, title, date, time)
            VALUES (${email}, ${title}, ${input.date}, ${input.time})`;
  revalidatePath("/");
}

export async function removeEvent(id: string) {
  const email = await requireEmail();
  await ensureSchema();
  await sql`DELETE FROM events WHERE id = ${id} AND owner_email = ${email}`;
  revalidatePath("/");
}
