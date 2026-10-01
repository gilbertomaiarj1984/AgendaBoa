export const EVENT_TYPES = ["escolar", "corrida", "outros"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const TYPE_LABEL: Record<EventType, string> = { escolar: "Escolar", corrida: "Corrida", outros: "Outros" };

export type EventItem = {
  id: string;
  title: string;
  type: EventType; // escolar = amarelo, corrida = vermelho, outros = sem cor
  date: string; // yyyy-mm-dd: dia em que começa (vale a hora de início)
  endDate: string; // yyyy-mm-dd: dia em que termina (vale a hora de fim); igual a `date` em item de um dia só
  start: string; // HH:MM
  end: string; // HH:MM
  owner: string; // e-mail de quem adicionou
  hasImage: boolean;
  v: number; // versão (ms) usada para invalidar o cache da imagem
};

export type EventInput = { title: string; type: EventType; date: string; endDate: string; start: string; end: string };

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
