"use client";

import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
