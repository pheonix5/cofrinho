export const colors = {
  bg: '#0B0B0F',
  bgSoft: '#15151C',
  bgCard: '#1C1C26',
  bgElev: '#23232F',
  ink: '#F4F4F7',
  inkSoft: '#C8C8D2',
  inkMuted: '#8A8A99',
  inkDim: '#5A5A66',
  brand: '#9AE66E',
  brandDeep: '#5FC23B',
  brandGlow: '#C8F5A6',
  income: '#4ADE80',
  expense: '#F87171',
  accent: '#A78BFA',
  warn: '#FBBF24',
  line: '#2A2A36',
} as const;

export type ColorToken = keyof typeof colors;
