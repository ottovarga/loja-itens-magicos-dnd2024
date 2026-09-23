import type { Shop } from "@/lib/types";
import { TextAreaField, TextField } from "./fields";

interface ShopInfoFormProps {
  shop: Shop;
  onChange: (shop: Shop) => void;
}

export function ShopInfoForm({ shop, onChange }: ShopInfoFormProps) {
  const set = (patch: Partial<Shop>) => onChange({ ...shop, ...patch });
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
      <TextField label="Nome" value={shop.name} onChange={(name) => set({ name })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Local" value={shop.location} onChange={(location) => set({ location })} />
        <TextField label="Tipo de loja" value={shop.kind} onChange={(kind) => set({ kind })} />
      </div>
      <TextAreaField label="Descrição" value={shop.description} onChange={(description) => set({ description })} />
      <TextAreaField label="Anotações do mestre" rows={6} value={shop.notes} onChange={(notes) => set({ notes })} />
      <p className="text-sm text-ink-soft">Salvo automaticamente.</p>
    </form>
  );
}
