"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createEvent, deleteEvent, listEvents, updateEvent } from "@/app/actions";
import {
  DOW, DOW_SHORT, MONTHS_FULL, VIEWS, addDays, dateKey, dowIndex, gridRange, isoWeek, isWeekend, longDate, mondayOf,
  ownRange, parseKey, rangeText, sameDay, startOfDay, type View,
} from "@/lib/dates";
import { eventsForDay, indexByDay, type DayEvent } from "@/lib/events";
import type { EventInput, EventItem } from "@/lib/types";
import { personFor } from "@/lib/users";
import DayCard from "./DayCard";
import { ItemForm, ItemView, PhotoViewer } from "./ItemDialogs";
import SchoolDialog from "./SchoolDialog";
import { CamIcon } from "./icons";

const VIEW_KEY = "agendaboa:view";
const PAD_DAYS = 45; // quanto além da tela já deixamos carregado
const VIEW_LABEL: Record<View, string> = { week: "Semana", "2weeks": "2 semanas", month: "Mês" };

type Modal = { k: "view"; id: string } | { k: "form"; id: string | null } | { k: "school" } | null;

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v && (VIEWS as string[]).includes(v)) return v as View;
  } catch { /* sem armazenamento: usa o padrão */ }
  return "week";
}

export default function Calendar({ initialEvents, initialRange, email, onSignOut }: {
  initialEvents: EventItem[];
  initialRange: [string, string] | null; // null: o servidor não conseguiu carregar, o cliente busca
  email: string;
  onSignOut: () => Promise<void>;
}) {
  const [now, setNow] = useState<Date | null>(null); // null até montar: a data depende do aparelho
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date(0));
  const [selected, setSelected] = useState<Date | null>(null);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [modal, setModal] = useState<Modal>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loaded = useRef<[string, string]>(initialRange ?? ["9999-12-31", "0000-01-01"]);
  const epoch = useRef(0); // sobe a cada alteração local, para descartar respostas de listagem antigas
  const headerRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Monta: lê a data/hora e a última visão usada neste aparelho.
  useEffect(() => {
    const d = new Date();
    setNow(d);
    setAnchor(startOfDay(d));
    setView(readView());
  }, []);

  // Relógio: atualiza o horário atual (marcador vermelho, "próximo compromisso") a cada 30 s.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // O conteúdo começa logo abaixo do cabeçalho fixo, cuja altura muda com a largura da tela.
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--top-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---- Carga de dados ---- */
  const load = useCallback(async (from: string, to: string) => {
    const startEpoch = epoch.current;
    const res = await listEvents(from, to);
    if (epoch.current !== startEpoch) return; // houve alteração local no meio do caminho
    if (res.ok) {
      loaded.current = [from, to];
      setEvents(res.data);
    } else {
      showToast(res.error);
    }
  }, [showToast]);

  const today = now ? startOfDay(now) : null;
  const [gs, ge] = useMemo(() => gridRange(view, anchor), [view, anchor]);

  useEffect(() => {
    if (!now) return;
    const need: [string, string] = [dateKey(gs), dateKey(ge)];
    const [lf, lt] = loaded.current;
    if (need[0] < lf || need[1] > lt) void load(dateKey(addDays(gs, -PAD_DAYS)), dateKey(addDays(ge, PAD_DAYS)));
  }, [now === null, gs, ge, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vê o que a outra pessoa mudou: ao voltar para a aba e a cada minuto.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void load(...loaded.current); };
    const t = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  const byDay = useMemo(() => indexByDay(events, gs, ge), [events, gs, ge]);
  const dayEvents = (d: Date): DayEvent[] => byDay.get(dateKey(d)) ?? eventsForDay(events, d);

  /* ---- Seleção e navegação ---- */
  function currentSelected(): Date {
    const [os, oe] = ownRange(view, anchor);
    if (selected && selected >= os && selected <= oe) return selected;
    return today && today >= os && today <= oe ? today : os;
  }

  function step(dir: number) {
    setAnchor(view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1) : addDays(anchor, (view === "week" ? 7 : 14) * dir));
    setSelected(null);
  }

  function changeView(v: View) {
    const keep = currentSelected();
    setView(v);
    setAnchor(keep);
    setSelected(keep);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignora */ }
  }

  function selectDay(d: Date) {
    setSelected(d);
    const [os, oe] = ownRange(view, anchor);
    if (d < os || d > oe) setAnchor(d);
  }

  /* ---- Alterações (ações do servidor) ---- */
  async function save(editId: string | null, input: EventInput, photo: string | null | undefined): Promise<string | null> {
    const res = editId ? await updateEvent(editId, input, photo) : await createEvent(input, photo ?? null);
    if (!res.ok) return res.error;
    epoch.current++;
    setEvents((list) => (editId ? list.map((e) => (e.id === editId ? res.data : e)) : [...list, res.data]));
    selectDay(parseKey(res.data.date));
    setModal(null);
    showToast(editId ? "Item atualizado" : "Item adicionado");
    return null;
  }

  async function remove(id: string): Promise<string | null> {
    const res = await deleteEvent(id);
    if (!res.ok) return res.error;
    epoch.current++;
    setEvents((list) => list.filter((e) => e.id !== id));
    setModal(null);
    showToast("Item excluído");
    return null;
  }

  /* ---- Tela ---- */
  const me = personFor(email);
  const header = (
    <header className="top" ref={headerRef}>
      <div className="top-in">
        <div className="title">
          <span className="brand">
            AgendaBoa
            <span className="badge sm" data-o={me.tone} title={`Você é ${me.name}`} aria-label={`Você é ${me.name}`}>{me.initial}</span>
            <form action={onSignOut}><button className="linkbtn" type="submit">Sair</button></form>
          </span>
          <span className="range">
            {!today ? "…" : view === "month"
              ? `${MONTHS_FULL[anchor.getMonth()].replace(/^./, (c) => c.toUpperCase())} ${anchor.getFullYear()}`
              : rangeText(gs, ge)}
          </span>
        </div>
        <div className="nav">
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Anterior">‹</button>
          <button className="today-btn" onClick={() => { if (today) { setAnchor(today); setSelected(today); } }}>Hoje</button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Próximo">›</button>
        </div>
        <div className="seg-row">
          <div className="seg" role="group" aria-label="Visão da agenda">
            {VIEWS.map((v) => (
              <button key={v} aria-pressed={view === v} onClick={() => changeView(v)}>{VIEW_LABEL[v]}</button>
            ))}
          </div>
          <button className="icon-btn school-btn" onClick={() => setModal({ k: "school" })} aria-label="Agenda escolar" title="Agenda escolar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /><path d="M22 10v6" /></svg>
          </button>
        </div>
      </div>
    </header>
  );

  if (!now || !today) {
    return (<>{header}<main><p className="loading">Carregando…</p></main></>);
  }

  const sel = currentSelected();
  const nowIdx = dowIndex(now);
  const viewEvent = modal?.k === "view" ? events.find((e) => e.id === modal.id) : undefined;
  const formEvent = modal?.k === "form" && modal.id ? events.find((e) => e.id === modal.id) ?? null : null;
  const photoEvent = photoId ? events.find((e) => e.id === photoId) : undefined;

  const cell = (d: Date, o: { box?: boolean; max: number; out?: boolean }) => {
    const evs = dayEvents(d);
    const cls = ["cell", isWeekend(d) ? "we" : "", o.box ? "wb" : "", o.out ? "out" : "", sameDay(d, today) ? "today" : "", sameDay(d, sel) ? "sel" : ""].filter(Boolean).join(" ");
    return (
      <button key={dateKey(d)} className={cls} onClick={() => selectDay(d)} aria-label={longDate(d)}>
        <span className="ctop">
          <span className="dnum">{d.getDate()}</span>
          {o.box && <span className="cdow">{DOW[dowIndex(d)]}</span>}
        </span>
        <span className="chips">
          {evs.slice(0, o.max).map((e) => (
            <span key={e.id} className="chip" data-t={e.type}>
              {e.hasImage && <CamIcon />}
              {e.seg.kind === "mid" ? "↔ " : e.seg.kind === "last" ? `→${e.end} ` : `${e.start} `}
              {e.title}
            </span>
          ))}
          {evs.length > o.max && <span className="more">+{evs.length - o.max} mais</span>}
        </span>
        <span className="dots">{evs.slice(0, 6).map((e) => <i key={e.id} data-t={e.type} />)}</span>
      </button>
    );
  };

  const weekBlock = (monday: Date, max: number, label?: string) => (
    <div className="wk" key={dateKey(monday)}>
      {label && <h2 className="wk-label">{label}</h2>}
      <div className="row5">{[0, 1, 2, 3, 4].map((i) => cell(addDays(monday, i), { max }))}</div>
      <div className="row2">{[5, 6].map((i) => cell(addDays(monday, i), { max, box: true }))}</div>
    </div>
  );

  const head = (cols: 5 | 7) => (
    <div className={`cal-head${cols === 7 ? " m7" : ""}`}>
      {DOW_SHORT.slice(0, cols).map((n, i) => <span key={n} className={today >= gs && today <= ge && i === nowIdx ? "now" : undefined}>{n}</span>)}
    </div>
  );

  const mon = mondayOf(anchor);
  let grid: React.ReactNode;
  if (view === "week") {
    grid = <>{head(5)}<div className="big">{weekBlock(mon, 6)}</div></>;
  } else if (view === "2weeks") {
    const w2 = addDays(mon, 7);
    grid = <>{head(5)}{weekBlock(mon, 2, `Semana ${isoWeek(mon)} · ${rangeText(mon, addDays(mon, 6))}`)}{weekBlock(w2, 2, `Semana ${isoWeek(w2)} · ${rangeText(w2, addDays(w2, 6))}`)}</>;
  } else {
    const days: Date[] = [];
    for (let d = gs; d <= ge; d = addDays(d, 1)) days.push(d);
    grid = <>{head(7)}<div className="month">{days.map((d) => cell(d, { max: 3, out: d.getMonth() !== anchor.getMonth() }))}</div></>;
  }

  return (
    <>
      {header}
      <main>
        <DayCard
          day={sel}
          now={now}
          events={dayEvents(sel)}
          showOpenWeek={view !== "week"}
          onAdd={() => setModal({ k: "form", id: null })}
          onOpenItem={(id) => setModal({ k: "view", id })}
          onOpenWeek={() => { setAnchor(sel); setSelected(sel); setView("week"); try { localStorage.setItem(VIEW_KEY, "week"); } catch { /* ignora */ } window.scrollTo(0, 0); }}
        />
        {grid}
      </main>

      {modal?.k === "view" && viewEvent && (
        <ItemView
          item={viewEvent}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ k: "form", id: viewEvent.id })}
          onDelete={() => remove(viewEvent.id)}
          onPhoto={() => setPhotoId(viewEvent.id)}
        />
      )}
      {modal?.k === "form" && (modal.id === null || formEvent) && (
        <ItemForm
          item={formEvent}
          defaultDate={dateKey(sel)}
          authorEmail={email}
          onClose={() => setModal(null)}
          onSave={(input, photo) => save(modal.id, input, photo)}
        />
      )}
      {modal?.k === "school" && <SchoolDialog now={now} onClose={() => setModal(null)} />}
      {photoEvent && <PhotoViewer item={photoEvent} onClose={() => setPhotoId(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
