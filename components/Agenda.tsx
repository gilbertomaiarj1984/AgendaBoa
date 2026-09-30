"use client";

import { useState, useTransition } from "react";
import { addEvent, removeEvent, type EventItem } from "@/app/actions";

export default function Agenda({ initial }: { initial: EventItem[] }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");

  return (
    <>
      <form
        className="row"
        style={{ flexWrap: "wrap", marginBottom: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          start(async () => {
            await addEvent({ title, date, time });
            setTitle("");
          });
        }}
      >
        <input style={{ flex: "1 1 100%" }} placeholder="Novo compromisso" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="btn" type="submit" disabled={pending}>Adicionar</button>
      </form>
      <ul style={{ opacity: pending ? 0.6 : 1 }}>
        {initial.map((i) => (
          <li key={i.id} className="card row" style={{ justifyContent: "space-between" }}>
            <span>
              <strong>{i.title}</strong>
              <br />
              <small style={{ color: "var(--muted)" }}>
                {new Date(`${i.date}T00:00`).toLocaleDateString("pt-BR")} às {i.time}
              </small>
            </span>
            <button className="btn ghost" disabled={pending} onClick={() => start(() => removeEvent(i.id))}>✕</button>
          </li>
        ))}
        {initial.length === 0 && <li style={{ color: "var(--muted)" }}>Nenhum compromisso.</li>}
      </ul>
    </>
  );
}
