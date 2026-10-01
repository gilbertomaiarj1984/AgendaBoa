export const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const DOW = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const DOW_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7)); // a semana começa na segunda
export const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
export const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
export const dowIndex = (d: Date) => (d.getDay() + 6) % 7; // 0 = segunda

export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
}

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const nowMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
export const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export function fmtIn(m: number): string {
  if (m < 1) return "agora";
  if (m < 60) return `em ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `em ${h}h${r ? ` ${pad(r)}min` : ""}`;
}

export const longDate = (d: Date) => `${DOW[dowIndex(d)]}, ${d.getDate()} de ${MONTHS_FULL[d.getMonth()]}`;

export function rangeText(a: Date, b: Date): string {
  const ma = MONTHS[a.getMonth()];
  const mb = MONTHS[b.getMonth()];
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()}–${b.getDate()} ${ma} ${a.getFullYear()}`;
  if (a.getFullYear() === b.getFullYear()) return `${a.getDate()} ${ma} – ${b.getDate()} ${mb} ${a.getFullYear()}`;
  return `${a.getDate()} ${ma} ${a.getFullYear()} – ${b.getDate()} ${mb} ${b.getFullYear()}`;
}

export type View = "week" | "2weeks" | "month";
export const VIEWS: View[] = ["week", "2weeks", "month"];

/** Dias que a visão mostra (no mês, a grade inteira, incluindo dias de meses vizinhos). */
export function gridRange(view: View, anchor: Date): [Date, Date] {
  if (view === "month") {
    const start = mondayOf(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const weeks = Math.ceil(((last.getTime() - start.getTime()) / 864e5 + 1) / 7);
    return [start, addDays(start, weeks * 7 - 1)];
  }
  const mon = mondayOf(anchor);
  return [mon, addDays(mon, view === "week" ? 6 : 13)];
}

/** Dias que "pertencem" à visão (no mês, só os do mês corrente). */
export function ownRange(view: View, anchor: Date): [Date, Date] {
  if (view === "month") return [new Date(anchor.getFullYear(), anchor.getMonth(), 1), new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)];
  return gridRange(view, anchor);
}
