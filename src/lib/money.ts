// Todo cálculo é feito em CENTAVOS (números inteiros) para evitar erro de arredondamento.
export const toCents = (v: number | string): number => Math.round(Number(v) * 100)
export const fromCents = (c: number): number => c / 100

export const fmt = (c: number): string =>
  (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Aceita "1.234,56", "200", "200,5", "R$ 200,00". Retorna centavos ou null se inválido.
export function parseMoney(s: string): number | null {
  const t = s.replace(/R\$|\s/g, '')
  if (!t) return null
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  if (!/^\d+(\.\d{1,2})?$/.test(norm)) return null
  return Math.round(parseFloat(norm) * 100)
}

// Aceita "10", "2,5", "10%". Retorna número ou null.
export function parseRate(s: string): number | null {
  const t = s.replace(/%|\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return null
  return parseFloat(t)
}

// Mesma regra do banco: round(capital * taxa / 100, 2)
export const interestCents = (principalC: number, rate: number): number =>
  Math.round((principalC * rate) / 100)

export const num2 = (c: number): string => (c / 100).toFixed(2).replace('.', ',')

export const centsToInput = (c: number): string => num2(c)
