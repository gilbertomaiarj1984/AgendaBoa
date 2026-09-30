"use client";

import { useEffect, useState } from "react";

type Item = { id: string; title: string; date: string; time: string };

// Armazenamento local por usuário (primeira versão). Trocar por banco de dados
// quando quiser sincronizar entre dispositivos.
export default function Agenda({ userKey }: { userKey: string }) {
  const storageKey = `agendaboa:${userKey}`;
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, loaded, storageKey]);

  const sorted = [...items].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <>
      <form
        className="row"
        style={{ flexWrap: "wrap", marginBottom: 16 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          setItems((s) => [...s, { id: crypto.randomUUID(), title: title.trim(), date, time }]);
          setTitle("");
        }}
      >
        <input style={{ flex: "1 1 100%" }} placeholder="Novo compromisso" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <button className="btn" type="submit">Adicionar</button>
      </form>
      <ul>
        {sorted.map((i) => (
          <li key={i.id} className="card row" style={{ justifyContent: "space-between" }}>
            <span>
              <strong>{i.title}</strong>
              <br />
              <small style={{ color: "var(--muted)" }}>
                {new Date(`${i.date}T00:00`).toLocaleDateString("pt-BR")} às {i.time}
              </small>
            </span>
            <button className="btn ghost" onClick={() => setItems((s) => s.filter((x) => x.id !== i.id))}>✕</button>
          </li>
        ))}
        {loaded && sorted.length === 0 && <li style={{ color: "var(--muted)" }}>Nenhum compromisso.</li>}
      </ul>
    </>
  );
}
