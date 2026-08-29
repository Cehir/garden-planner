import '@testing-library/jest-dom/vitest'

// Node >= 25 stellt ein natives localStorage-Stub ohne Methoden bereit
// (sofern kein --localstorage-file gesetzt ist), das happy-doms Implementierung
// überdeckt. Für die Tests ersetzen wir es durch eine In-Memory-Implementierung.
if (typeof localStorage !== 'object' || typeof localStorage.clear !== 'function') {
  const data = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
}