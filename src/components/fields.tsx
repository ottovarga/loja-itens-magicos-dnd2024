interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TextField({ label, value, onChange, placeholder, autoFocus }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, rows = 4 }: TextAreaFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <textarea
        className="field"
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  /** NaN mostra o campo vazio. */
  value: number;
  /** Recebe NaN quando o campo fica vazio. */
  onChange: (value: number) => void;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
}

export function NumberField({ label, value, onChange, min, disabled, placeholder }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input
        type="number"
        className="field numbers"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))
        }
      />
    </label>
  );
}
