"use client";

import { useState } from "react";
import type { NewShopInput } from "@/lib/shop";
import { TextField } from "./fields";
import { Modal } from "./Modal";

interface NewShopDialogProps {
  onCreate: (input: NewShopInput) => void;
  onCancel: () => void;
}

export function NewShopDialog({ onCreate, onCancel }: NewShopDialogProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [kind, setKind] = useState("");
  const canCreate = name.trim() !== "";

  return (
    <Modal title="Nova loja" onClose={onCancel}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (canCreate) onCreate({ name, location, kind });
        }}
      >
        <TextField label="Nome" value={name} onChange={setName} autoFocus />
        <TextField label="Local" value={location} onChange={setLocation} />
        <TextField
          label="Tipo de loja"
          value={kind}
          onChange={setKind}
          placeholder="Ferreiro, alquimista, antiquário…"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canCreate}>
            Criar loja
          </button>
        </div>
      </form>
    </Modal>
  );
}
