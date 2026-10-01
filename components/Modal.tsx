"use client";

import { useEffect, useRef, type ReactNode } from "react";

// <dialog> nativo: o navegador cuida do foco, do Esc e de deixar a janela acima de tudo.
export default function Modal({ label, onClose, className = "sheet", children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close(); }} // clique no fundo escurecido
    >
      {children}
    </dialog>
  );
}
