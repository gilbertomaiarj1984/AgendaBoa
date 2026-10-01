import { addDays, dateKey, parseKey, toMin, DOW_SHORT, MONTHS, dowIndex } from "./dates";
import type { EventItem } from "./types";

export const shortDate = (d: Date) => `${DOW_SHORT[dowIndex(d)].toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
export const isMultiDay = (e: EventItem) => e.endDate !== e.date;
export const dayCount = (e: EventItem) => Math.round((parseKey(e.endDate).getTime() - parseKey(e.date).getTime()) / 864e5) + 1;

/** Parte de um compromisso que cai em um dia: no primeiro dia vale a hora de início, no último a hora de fim. */
export type Segment = { s: number; e: number; label: string; kind: "single" | "first" | "mid" | "last" };
export type DayEvent = EventItem & { seg: Segment };

export function segmentFor(e: EventItem, key: string): Segment {
  if (!isMultiDay(e)) return { s: toMin(e.start), e: toMin(e.end), label: `${e.start}–${e.end}`, kind: "single" };
  if (key === e.date) return { s: toMin(e.start), e: 1440, label: `${e.start} →`, kind: "first" };
  if (key === e.endDate) return { s: 0, e: toMin(e.end), label: `→ ${e.end}`, kind: "last" };
  return { s: 0, e: 1440, label: "Dia todo", kind: "mid" };
}

/** Compromissos que ocupam o dia `d`, ordenados pelo começo da parte que cai nele. */
export function eventsForDay(events: EventItem[], d: Date): DayEvent[] {
  const k = dateKey(d);
  return events
    .filter((e) => e.date <= k && e.endDate >= k)
    .map((e) => ({ ...e, seg: segmentFor(e, k) }))
    .sort((a, b) => a.seg.s - b.seg.s || a.title.localeCompare(b.title, "pt-BR"));
}

/** Índice por dia (yyyy-mm-dd) para os dias de [from, to], para a grade não refiltrar a lista a cada célula. */
export function indexByDay(events: EventItem[], from: Date, to: Date): Map<string, DayEvent[]> {
  const out = new Map<string, DayEvent[]>();
  for (let d = from; d <= to; d = addDays(d, 1)) out.set(dateKey(d), eventsForDay(events, d));
  return out;
}

export function endLabel(e: EventItem): string {
  return isMultiDay(e) ? `${shortDate(parseKey(e.endDate))} ${e.end}` : e.end;
}
