import type { TxKind } from '@/db/types';

export type ParsedVoice = {
  kind: TxKind | null;
  amount_cents: number | null;
  category_hint: string | null;
  occurred_at: string;
  description: string;
};

const EXPENSE_VERBS = [
  'gastei', 'gasto', 'paguei', 'pago', 'comprei', 'compra',
  'saída', 'saida', 'despesa', 'tirei', 'investi',
];
const INCOME_VERBS = [
  'recebi', 'ganhei', 'entrou', 'entrada', 'salário', 'salario',
  'rendeu', 'me pagaram', 'receita',
];

const CATEGORY_HINTS: Array<{ keywords: string[]; name: string; kind: TxKind }> = [
  { name: 'Mercado', kind: 'expense', keywords: ['mercado', 'supermercado', 'feira', 'hortifruti'] },
  { name: 'Alimentação', kind: 'expense', keywords: ['comida', 'almoço', 'almoco', 'jantar', 'lanche', 'ifood', 'restaurante', 'café', 'cafe', 'padaria', 'pizza', 'hamburguer'] },
  { name: 'Transporte', kind: 'expense', keywords: ['uber', '99', 'táxi', 'taxi', 'ônibus', 'onibus', 'metro', 'metrô', 'gasolina', 'combustível', 'combustivel', 'estacionamento'] },
  { name: 'Moradia', kind: 'expense', keywords: ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'internet', 'iptu'] },
  { name: 'Saúde', kind: 'expense', keywords: ['farmácia', 'farmacia', 'remédio', 'remedio', 'médico', 'medico', 'consulta', 'dentista', 'plano'] },
  { name: 'Educação', kind: 'expense', keywords: ['curso', 'livro', 'faculdade', 'escola', 'mensalidade'] },
  { name: 'Lazer', kind: 'expense', keywords: ['cinema', 'show', 'jogo', 'bar', 'cerveja', 'festa', 'streaming'] },
  { name: 'Assinaturas', kind: 'expense', keywords: ['netflix', 'spotify', 'assinatura', 'youtube', 'disney', 'prime'] },
  { name: 'Salário', kind: 'income', keywords: ['salário', 'salario', 'holerite', 'pagamento'] },
  { name: 'Freelance', kind: 'income', keywords: ['freela', 'freelance', 'projeto', 'cliente'] },
  { name: 'Investimentos', kind: 'income', keywords: ['rendimento', 'dividendo', 'juros', 'investimento'] },
  { name: 'Presente', kind: 'income', keywords: ['presente', 'pix do', 'me deu', 'recebi de'] },
];

const NUM_WORDS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, três: 3, tres: 3, quatro: 4,
  cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, cincoenta: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800,
  novecentos: 900, mil: 1000,
};

export function parseVoiceCommand(raw: string, now: Date = new Date()): ParsedVoice {
  const text = raw.toLowerCase().trim();
  let working = ` ${text} `;

  let kind: TxKind | null = null;
  for (const v of EXPENSE_VERBS) {
    if (new RegExp(`\\b${v}\\b`).test(text)) { kind = 'expense'; break; }
  }
  if (!kind) {
    for (const v of INCOME_VERBS) {
      if (new RegExp(`\\b${v}\\b`).test(text)) { kind = 'income'; break; }
    }
  }

  const amount_cents = extractAmount(text);

  let category_hint: string | null = null;
  for (const hint of CATEGORY_HINTS) {
    if (hint.keywords.some((k) => text.includes(k))) {
      category_hint = hint.name;
      if (!kind) kind = hint.kind;
      break;
    }
  }

  let date = new Date(now);
  if (/\bontem\b/.test(text)) {
    date.setDate(date.getDate() - 1);
  } else if (/\banteontem\b/.test(text)) {
    date.setDate(date.getDate() - 2);
  }

  const description = cleanDescription(text);

  return {
    kind,
    amount_cents,
    category_hint,
    occurred_at: date.toISOString(),
    description,
  };
}

function extractAmount(text: string): number | null {
  const numeric = text.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (numeric) {
    const raw = numeric[1].replace(',', '.');
    const val = parseFloat(raw);
    if (!Number.isNaN(val)) return Math.round(val * 100);
  }

  const tokens = text.replace(/[^a-zà-ú\s]/gi, ' ').split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let matched = false;
  for (const tok of tokens) {
    const n = NUM_WORDS[tok];
    if (n === undefined) continue;
    matched = true;
    if (n === 1000) {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
    } else if (n === 100 && current > 0) {
      current = current * 100;
    } else {
      current += n;
    }
  }
  total += current;
  return matched && total > 0 ? total * 100 : null;
}

function cleanDescription(text: string): string {
  let s = text;
  const removeWords = [
    ...EXPENSE_VERBS,
    ...INCOME_VERBS,
    'reais', 'real', 'conto', 'contos', 'pila', 'pilas',
    'no', 'na', 'do', 'da', 'de', 'em', 'com', 'pra', 'para', 'ao', 'à',
    'hoje', 'ontem', 'anteontem',
  ];
  for (const w of removeWords) {
    s = s.replace(new RegExp(`\\b${w}\\b`, 'gi'), ' ');
  }
  s = s.replace(/\d+(?:[.,]\d+)?/g, ' ').replace(/\s+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
