"use client";

import { useEffect, useRef } from "react";
import { DOW, DOW_SHORT, dowIndex, nowMin, toMin } from "@/lib/dates";
import { AULAS } from "@/lib/escola";
import Modal from "./Modal";

// Tabela simples da agenda escolar: horário × dia da semana × matéria, sem datas.
export default function SchoolDialog({ now, onClose }: { now: Date; onClose: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const di = dowIndex(now); // 0 = segunda; 5 e 6 = fim de semana (sem coluna)
  const nm = nowMin(now);

  useEffect(() => {
    // No celular a tabela rola na horizontal: deixa a coluna de hoje à vista.
    const w = wrapRef.current;
    const th = w?.querySelector<HTMLElement>("th.today-col");
    if (w) w.scrollLeft = th ? Math.max(0, th.offsetLeft - 62) : 0;
  }, []);

  return (
    <Modal label="Agenda escolar" onClose={onClose} className="sheet wide">
      <div className="sheet-in">
        <div className="school-h">
          <div><h2>Agenda escolar</h2><p>Aulas da Julia, de segunda a sexta</p></div>
          <button className="x-btn" onClick={onClose} aria-label="Fechar agenda escolar" autoFocus>×</button>
        </div>
        <div className="tbl-wrap" ref={wrapRef}>
          <table className="grade">
            <thead>
              <tr>
                <th className="t-col">Horário</th>
                {DOW.slice(0, 5).map((n, i) => (
                  <th key={n} className={i === di ? "today-col" : undefined}><span className="d-full">{n}</span><span className="d-short">{DOW_SHORT[i]}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AULAS.map((r) => {
                const live = toMin(r.start) <= nm && nm < toMin(r.end);
                return (
                  <tr key={r.start}>
                    <td className="t-col">{r.start}<br />{r.end}</td>
                    {r.materias.map((m, i) => (
                      <td key={i} className={[i === di ? "today-col" : "", i === di && live ? "now-cell" : ""].filter(Boolean).join(" ") || undefined}>{m}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
