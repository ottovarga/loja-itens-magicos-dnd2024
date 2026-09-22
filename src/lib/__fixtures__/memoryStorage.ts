interface MemoryStorageOptions {
  /** Limite de caracteres (chaves + valores). Acima dele, setItem lança QuotaExceededError. */
  quotaChars?: number;
  /** Simula navegador que bloqueia o storage. */
  unavailable?: boolean;
}

export function memoryStorage(options: MemoryStorageOptions = {}): Storage {
  const data = new Map<string, string>();
  const guard = () => {
    if (options.unavailable) throw new DOMException("bloqueado", "SecurityError");
  };
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => {
      guard();
      return data.get(key) ?? null;
    },
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      guard();
      const used = [...data.entries()]
        .filter(([k]) => k !== key)
        .reduce((sum, [k, v]) => sum + k.length + v.length, 0);
      if (options.quotaChars !== undefined && used + key.length + value.length > options.quotaChars) {
        throw new DOMException("cheio", "QuotaExceededError");
      }
      data.set(key, String(value));
    },
  };
}
