import { addNpc, removeNpc, updateNpc } from "@/lib/shop";
import type { IdSource, Npc } from "@/lib/types";
import { TextAreaField, TextField } from "./fields";

interface NpcListProps {
  npcs: Npc[];
  deps: IdSource;
  onChange: (npcs: Npc[]) => void;
}

export function NpcList({ npcs, deps, onChange }: NpcListProps) {
  return (
    <div className="flex flex-col gap-4">
      {npcs.length === 0 && <p>Nenhum NPC ainda.</p>}
      {npcs.map((npc) => (
        <fieldset key={npc.id} className="frame flex flex-col gap-2 p-4">
          <legend className="title px-1 text-lg">{npc.name || "NPC sem nome"}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <TextField label="Nome" value={npc.name} onChange={(name) => onChange(updateNpc(npcs, npc.id, { name }))} />
            <TextField
              label="Papel"
              value={npc.role}
              placeholder="Dono, aprendiz, guarda…"
              onChange={(role) => onChange(updateNpc(npcs, npc.id, { role }))}
            />
          </div>
          <TextAreaField
            label="Descrição"
            value={npc.description}
            onChange={(description) => onChange(updateNpc(npcs, npc.id, { description }))}
          />
          <button type="button" className="self-end text-sm text-blood underline" onClick={() => onChange(removeNpc(npcs, npc.id))}>
            {`Remover ${npc.name || "NPC"}`}
          </button>
        </fieldset>
      ))}
      <button type="button" className="btn self-start" onClick={() => onChange(addNpc(npcs, deps))}>
        Adicionar NPC
      </button>
    </div>
  );
}
