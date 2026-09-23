"use client";

import { useEffect, useId, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay)] p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="frame max-h-[90dvh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="title mb-4 text-2xl">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
