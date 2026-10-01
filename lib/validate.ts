import { EVENT_TYPES, type EventInput } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_DAYS = 366;

export function isDateKey(s: string): boolean {
  return DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

// Usado no cliente (antes de enviar) e no servidor (nunca confiar só no cliente).
export function validateInput(i: EventInput): string | null {
  if (!i.title.trim()) return "Escreva um título para o item.";
  if (i.title.trim().length > 200) return "O título pode ter no máximo 200 caracteres.";
  if (!(EVENT_TYPES as readonly string[]).includes(i.type)) return "Escolha o tipo do item.";
  if (!isDateKey(i.date) || !isDateKey(i.endDate)) return "Informe a data de início e a data de fim.";
  if (!TIME_RE.test(i.start) || !TIME_RE.test(i.end)) return "Informe a hora de início e a hora de fim.";
  const same = i.endDate === i.date;
  if (`${i.endDate} ${i.end}` <= `${i.date} ${i.start}`) return same ? "A hora de fim deve ser depois da hora de início." : "O fim deve ser depois do início.";
  const days = (Date.parse(`${i.endDate}T00:00:00Z`) - Date.parse(`${i.date}T00:00:00Z`)) / 864e5;
  if (days > MAX_DAYS) return "O compromisso pode durar no máximo 1 ano.";
  return null;
}
