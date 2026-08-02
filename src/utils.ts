let counter = 0

export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`
}

export const snap = (v: number, grid = 10): number => Math.round(v / grid) * grid
