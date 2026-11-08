// Converte erros técnicos em mensagens claras em português.
export function errMsg(e: unknown): string {
  const err = e as { message?: string; code?: string } | null
  const m = String(err?.message ?? e ?? '')
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(m))
    return 'Sem conexão com a internet ou com o servidor. Verifique o sinal e tente de novo.'
  if (err?.code === '23503')
    return 'Este registro tem movimentações vinculadas e não pode ser excluído. Apague primeiro o que está ligado a ele.'
  if (err?.code === 'P0001') return m
  if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/jwt|not authenticated/i.test(m)) return 'Sua sessão expirou. Entre novamente.'
  return m || 'Ocorreu um erro inesperado.'
}
