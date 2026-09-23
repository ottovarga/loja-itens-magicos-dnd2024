"use client";

import { useState, type FormEvent } from "react";
import { evenWeights, sanitizeConfig } from "@/lib/config";
import { RARITY_LABEL, TYPE_LABEL } from "@/lib/labels";
import { ITEM_TYPES, RARITIES, type GenConfig, type ItemType, type Rarity } from "@/lib/types";
import { NumberField } from "./fields";

interface GeneratorFormProps {
  initial: GenConfig;
  submitLabel: string;
  onSubmit: (config: GenConfig) => void;
  onCancel?: () => void;
}

type RangeKind = "potion" | "scroll";

export function GeneratorForm({ initial, submitLabel, onSubmit, onCancel }: GeneratorFormProps) {
  const [config, setConfig] = useState<GenConfig>(initial);
  const byWeights = config.typeWeights !== undefined;

  const patch = (changes: Partial<GenConfig>) => setConfig((c) => ({ ...c, ...changes }));

  const setCount = (rarity: Rarity, value: number) =>
    setConfig((c) => ({ ...c, rarityCounts: { ...c.rarityCounts, [rarity]: value } }));

  const toggleType = (type: ItemType) =>
    setConfig((c) => ({
      ...c,
      types: c.types.includes(type)
        ? c.types.filter((t) => t !== type)
        : ITEM_TYPES.filter((t) => t === type || c.types.includes(t)),
    }));

  const setWeight = (type: ItemType, value: number) =>
    setConfig((c) => ({ ...c, typeWeights: { ...c.typeWeights, [type]: value } }));

  const setRange = (kind: RangeKind, position: 0 | 1, value: number) =>
    setConfig((c) => {
      const range = [...c.qtyRange[kind]] as [number, number];
      range[position] = value;
      return { ...c, qtyRange: { ...c.qtyRange, [kind]: range } };
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(sanitizeConfig(config));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Quantidade por raridade</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RARITIES.map((rarity) => (
            <NumberField
              key={rarity}
              label={RARITY_LABEL[rarity]}
              value={config.rarityCounts[rarity]}
              min={0}
              disabled={rarity === "artifact" && !config.includeArtifacts}
              onChange={(value) => setCount(rarity, value)}
            />
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.includeArtifacts}
            onChange={(event) => patch({ includeArtifacts: event.target.checked })}
          />
          Incluir artefatos
        </label>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Tipos de item</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ITEM_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Distribuição por tipo</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="distribution"
              checked={!byWeights}
              onChange={() => patch({ typeWeights: undefined })}
            />
            Tudo randômico
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="distribution"
              checked={byWeights}
              onChange={() => setConfig((c) => ({ ...c, typeWeights: evenWeights(c.types) }))}
            />
            Percentual por tipo
          </label>
        </div>
        {byWeights && (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              Os percentuais funcionam como proporções. O resultado se aproxima deles, sem ser exato.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {config.types.map((type) => (
                <NumberField
                  key={type}
                  label={`Peso de ${TYPE_LABEL[type]} (%)`}
                  value={config.typeWeights?.[type] ?? 0}
                  min={0}
                  onChange={(value) => setWeight(type, value)}
                />
              ))}
            </div>
          </>
        )}
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Consumíveis e repetição</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Poções — mínimo" value={config.qtyRange.potion[0]} min={1} onChange={(v) => setRange("potion", 0, v)} />
          <NumberField label="Poções — máximo" value={config.qtyRange.potion[1]} min={1} onChange={(v) => setRange("potion", 1, v)} />
          <NumberField label="Pergaminhos — mínimo" value={config.qtyRange.scroll[0]} min={1} onChange={(v) => setRange("scroll", 0, v)} />
          <NumberField label="Pergaminhos — máximo" value={config.qtyRange.scroll[1]} min={1} onChange={(v) => setRange("scroll", 1, v)} />
        </div>
        <label className="mt-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.allowRepeat}
            onChange={(event) => patch({ allowRepeat: event.target.checked })}
          />
          Permitir itens repetidos
        </label>
      </fieldset>

      <fieldset className="frame p-4">
        <legend className="title px-1 text-lg">Preço</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Variação aleatória (±%)"
            value={config.randomVariance}
            min={0}
            onChange={(value) => patch({ randomVariance: value })}
          />
          <NumberField
            label="Percentual geral da loja (%)"
            value={config.generalMod}
            onChange={(value) => patch({ generalMod: value })}
          />
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
