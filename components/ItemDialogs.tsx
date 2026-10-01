"use client";

import { useRef, useState } from "react";
import { longDate, parseKey } from "@/lib/dates";
import { dayCount, isMultiDay, shortDate } from "@/lib/events";
import { compressImage } from "@/lib/image";
import { EVENT_TYPES, TYPE_LABEL, type EventInput, type EventItem, type EventType } from "@/lib/types";
import { personFor } from "@/lib/users";
import { validateInput } from "@/lib/validate";
import Modal from "./Modal";

export const imageUrl = (e: Pick<EventItem, "id" | "v">) => `/api/events/${e.id}/image?v=${e.v}`;

/* ---------- Ver / editar / excluir ---------- */
export function ItemView({ item, onClose, onEdit, onDelete, onPhoto }: {
  item: EventItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<string | null>; // devolve mensagem de erro, ou null se excluiu
  onPhoto: () => void;
}) {
  const p = personFor(item.owner);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal label={item.title} onClose={onClose}>
      <div className="sheet-in">
        <div className="who-line">
          <span className="badge" data-o={p.tone}>{p.initial}</span>
          <span>Adicionado por {p.name}</span>
          {item.type !== "outros" && <span className="ty" data-t={item.type}>{TYPE_LABEL[item.type]}</span>}
        </div>
        <h2>{item.title}</h2>
        {isMultiDay(item) ? (
          <p className="v-meta">
            <b>{shortDate(parseKey(item.date))} {item.start} → {shortDate(parseKey(item.endDate))} {item.end}</b>
            <span>{dayCount(item)} dias</span>
          </p>
        ) : (
          <p className="v-meta"><b>{item.start}–{item.end}</b><span>{longDate(parseKey(item.date))}</span></p>
        )}
        {item.hasImage && (
          <div>
            <button className="thumb-lg" onClick={onPhoto} aria-label="Ver foto em tela cheia">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(item)} alt={`Foto de ${item.title}`} />
            </button>
            <p className="note">Toque na foto para ver em tela cheia.</p>
          </div>
        )}
        {error && <p className="errmsg" role="alert">{error}</p>}
        {confirming ? (
          <div className="confirm" role="alertdialog" aria-label="Confirmar exclusão">
            <p>Excluir “{item.title}”? Esta ação não pode ser desfeita.</p>
            <div className="actions">
              <button className="btn2" onClick={() => setConfirming(false)} disabled={busy} autoFocus>Cancelar</button>
              <button
                className="btn2 danger-solid"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const err = await onDelete();
                  if (err) { setError(err); setConfirming(false); setBusy(false); }
                }}
              >{busy ? "Excluindo…" : "Excluir item"}</button>
            </div>
          </div>
        ) : (
          <div className="actions split">
            <button className="btn2 danger" onClick={() => setConfirming(true)}>Excluir</button>
            <span className="grow" />
            <button className="btn2" onClick={onClose}>Fechar</button>
            <button className="btn2 primary" onClick={onEdit} autoFocus>Editar</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Novo item / editar ---------- */
type PhotoState = { kind: "keep" } | { kind: "none" } | { kind: "new"; dataUrl: string };

export function ItemForm({ item, defaultDate, authorEmail, onClose, onSave }: {
  item: EventItem | null; // null = novo
  defaultDate: string;
  authorEmail: string;
  onClose: () => void;
  onSave: (input: EventInput, photo: string | null | undefined) => Promise<string | null>; // erro ou null
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [type, setType] = useState<EventType>(item?.type ?? "outros");
  const [date, setDate] = useState(item?.date ?? defaultDate);
  const [endDate, setEndDate] = useState(item?.endDate ?? item?.date ?? defaultDate);
  const [start, setStart] = useState(item?.start ?? "09:00");
  const [end, setEnd] = useState(item?.end ?? "10:00");
  const [photo, setPhoto] = useState<PhotoState>(item?.hasImage ? { kind: "keep" } : { kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const author = personFor(item?.owner ?? authorEmail);

  const preview = photo.kind === "new" ? photo.dataUrl : photo.kind === "keep" && item ? imageUrl(item) : null;

  function changeDate(v: string) {
    // mantém a data final junto da inicial, a menos que já tenha sido escolhida outra posterior
    if (!endDate || endDate === date || endDate < v) setEndDate(v);
    setDate(v);
  }

  function changeStart(v: string) {
    setStart(v);
    if (v && endDate === date && end <= v) {
      const h = Number(v.slice(0, 2));
      setEnd(h >= 23 ? "23:59" : `${String(h + 1).padStart(2, "0")}:${v.slice(3)}`); // mantém o fim depois do início
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPhoto({ kind: "new", dataUrl: await compressImage(file) });
    } catch {
      setError("Não foi possível ler essa imagem. Tente outra foto.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: EventInput = { title: title.trim(), type, date, endDate, start, end };
    const invalid = validateInput(input);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError(null);
    const photoArg = photo.kind === "new" ? photo.dataUrl : photo.kind === "none" && item?.hasImage ? null : undefined;
    const err = await onSave(input, photoArg);
    if (err) { setError(err); setBusy(false); }
  }

  return (
    <Modal label={item ? "Editar item" : "Novo item"} onClose={onClose}>
      <form className="sheet-in" onSubmit={submit} noValidate>
        <h2>{item ? "Editar item" : "Novo item"}</h2>
        <div className="field">
          <label htmlFor="f-title">Título</label>
          <input id="f-title" type="text" maxLength={200} placeholder="Ex.: Consulta no dentista" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <span className="lbl">Tipo</span>
          <div className="types" role="group" aria-label="Tipo de compromisso">
            {EVENT_TYPES.map((t) => (
              <button key={t} type="button" data-t={t} aria-pressed={type === t} onClick={() => setType(t)}><i />{TYPE_LABEL[t]}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="lbl">Início</span>
          <div className="dt">
            <input id="f-date" type="date" value={date} onChange={(e) => changeDate(e.target.value)} aria-label="Data de início" />
            <input id="f-start" type="time" value={start} onChange={(e) => changeStart(e.target.value)} aria-label="Hora de início" />
          </div>
        </div>
        <div className="field">
          <span className="lbl">Fim</span>
          <div className="dt">
            <input id="f-edate" type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} aria-label="Data de fim" />
            <input id="f-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Hora de fim" />
          </div>
          <p className="note">Para um compromisso de vários dias, escolha a data final. A hora de início vale para o primeiro dia e a hora de fim para o último.</p>
        </div>
        <div className="field">
          <span className="lbl">Foto</span>
          <div className="photo-row">
            <button type="button" className="btn2" onClick={() => fileRef.current?.click()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></svg>
              {preview ? "Tirar outra foto" : "Tirar foto"}
            </button>
            {preview && (
              <>
                <span className="preview">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={preview} alt="Foto do item" /></span>
                <button type="button" className="link-btn" onClick={() => { setPhoto({ kind: "none" }); if (fileRef.current) fileRef.current.value = ""; }}>Remover</button>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <div className="who-line">
          <span className="badge" data-o={author.tone}>{author.initial}</span>
          <span>{item ? `Adicionado por ${author.name}` : `Será adicionado por ${author.name}`}</span>
        </div>
        {error && <p className="errmsg" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" className="btn2" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn2 primary" disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Foto em tela cheia ---------- */
export function PhotoViewer({ item, onClose }: { item: EventItem; onClose: () => void }) {
  return (
    <Modal label={`Foto de ${item.title}`} onClose={onClose} className="viewer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(item)} alt={`Foto de ${item.title}`} />
      <button className="viewer-x" onClick={onClose} aria-label="Fechar foto">×</button>
    </Modal>
  );
}
