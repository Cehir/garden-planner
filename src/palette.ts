export const BED_COLORS = [
  '#7fb069',
  '#6fa3a8',
  '#d9a441',
  '#b0697f',
  '#8a7bb8',
  '#d07b4f',
  '#7b8f4f',
  '#4f7bb0',
]

export const PLANT_COLORS = [
  '#3f7d43',
  '#7fb069',
  '#d6364c',
  '#e8822e',
  '#e8a30f',
  '#8a7bb8',
  '#d0527a',
  '#6fa3a8',
]

/** App accent (dark green) for selection, handles and headings — keep in sync with App.css. */
export const ACCENT_COLOR = '#2f6f4f'

/** Dark brown ink for text on the plan and shadow fills — keep in sync with App.css. */
export const INK_COLOR = '#3a362e'

/** Muted brown for the garden frame and the compass ring. */
export const FRAME_COLOR = '#a89f8d'

/** Default color for newly drawn beds — must stay inside BED_COLORS. */
export const DEFAULT_BED_COLOR = BED_COLORS[0]

export const BED_COLOR_NAMES: Record<string, string> = {
  '#7fb069': 'Grün',
  '#6fa3a8': 'Blau',
  '#d9a441': 'Gold',
  '#b0697f': 'Purpur',
  '#8a7bb8': 'Violett',
  '#d07b4f': 'Orange',
  '#7b8f4f': 'Oliv',
  '#4f7bb0': 'Himmel',
}
