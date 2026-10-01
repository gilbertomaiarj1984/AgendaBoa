"use client";

import { fmtIn, hhmm, longDate, nowMin, sameDay, startOfDay } from "@/lib/dates";
import { endLabel, isMultiDay, type DayEvent } from "@/lib/events";
import { TYPE_LABEL } from "@/lib/types";
import { personFor } from "@/lib/users";
import { CamIcon, PlusIcon } from "./icons";

type Props = {
  day: Date;
  now: Date;
  events: DayEvent[]; // já ordenados
  showOpenWeek: boolean;
  onAdd: () => void;
  onOpenItem: (id: string) => void;
  onOpenWeek: () => void;
};

export default function DayCard({ day, now, events: evs, showOpenWeek, onAdd, onOpenItem, onOpenWeek }: Props) {
  const isToday = sameDay(day, startOfDay(now));
  const nm = nowMin(now);
  const ongoing = isToday ? evs.find((e) => e.seg.s <= nm && nm < e.seg.e) : undefined;
  const next = isToday ? evs.find((e) => e.seg.s > nm) : undefined;
  const nextPerson = next ? personFor(next.owner) : null;

  // O marcador do horário atual entra entre o último item que já começou e o primeiro que ainda vai começar.
  const firstFuture = evs.findIndex((e) => e.seg.s > nm);
  const nowIdx = isToday && evs.length ? (firstFuture < 0 ? evs.length : firstFuture) : -1;
  const rows: React.ReactNode[] = evs.map((e) => {
    const p = personFor(e.owner);
    const cls = ["li-btn", isToday && e.seg.e <= nm ? "past" : "", next?.id === e.id ? "next" : ""].filter(Boolean).join(" ");
    return (
      <li key={e.id}>
        <button className={cls} onClick={() => onOpenItem(e.id)} aria-label={`Abrir ${e.title}`}>
          <span className="t">{e.seg.label}</span>
          <span className="n">
            <span className="ttl">
              <span className="badge" data-o={p.tone} title={`Adicionado por ${p.name}`}>{p.initial}</span>
              <span>{e.title}</span>
            </span>
            {e.hasImage && <CamIcon />}
            {e.type !== "outros" && <span className="ty" data-t={e.type}>{TYPE_LABEL[e.type]}</span>}
            {next?.id === e.id && <span className="tag">Próximo</span>}
            {ongoing?.id === e.id && <span className="tag live-tag">Agora</span>}
          </span>
        </button>
      </li>
    );
  });
  if (nowIdx >= 0) {
    rows.splice(nowIdx, 0, (
      <li key="now" className="nowrow" role="separator" aria-label={`Agora são ${hhmm(nm)}`}>
        <span className="now-t">{hhmm(nm)}</span>
      </li>
    ));
  }

  return (
    <section className="detail" aria-live="polite">
      <div className="dh">
        <h2>{longDate(day)}</h2>
        {isToday && <span className="pill">Hoje</span>}
        <button className="add-btn" onClick={onAdd} aria-label={`Adicionar item em ${longDate(day)}`} title="Adicionar item"><PlusIcon /></button>
      </div>

      {ongoing && (
        <p className="live">
          <i />
          <span>
            Agora: <b>{ongoing.title}</b> até {endLabel(ongoing)}
            {!isMultiDay(ongoing) && ` (${fmtIn(ongoing.seg.e - nm).replace("em ", "faltam ")})`}
          </span>
        </p>
      )}
      {next && nextPerson && (
        <button className="nextbar" onClick={() => onOpenItem(next.id)}>
          <span className="nb-l">Próximo compromisso</span>
          <span className="nb-t"><span className="badge" data-o={nextPerson.tone}>{nextPerson.initial}</span><span>{next.title}</span></span>
          <span className="nb-s">{next.seg.label}</span>
          <span className="nb-in">{fmtIn(next.seg.s - nm)}</span>
        </button>
      )}
      {isToday && !next && evs.length > 0 && <p className="nextbar idle">Sem mais compromissos hoje.</p>}

      {evs.length ? <ul className="li-list">{rows}</ul> : <p className="empty">Nada neste dia. Toque em + para adicionar.</p>}
      {showOpenWeek && <button className="open-week" onClick={onOpenWeek}>Abrir semana</button>}
    </section>
  );
}
