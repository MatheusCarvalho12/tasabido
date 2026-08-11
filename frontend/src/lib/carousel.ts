/**
 * Matemática pura do carrossel infinito (DOM triplicado: [cópia0 | cópia1 |
 * cópia2]). O scroll vive na cópia do meio; ao sair dela, salta de volta sem
 * animação — visualmente o loop nunca acaba, mesmo com 6 jogos.
 */

/**
 * Índice lógico (0..count-1) a partir do índice bruto da fileira triplicada.
 * Aceita valores negativos (scroll para trás) e acima de count (loop).
 */
export function normalizeIndex(rawIndex: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return ((rawIndex % count) + count) % count
}

/**
 * Salto necessário (em passos de item) para voltar à cópia do meio, ou null
 * quando o índice bruto já está nela. Com 3 cópias e N itens, a cópia do meio
 * ocupa os índices N..2N-1.
 */
export function loopJump(rawIndex: number, count: number, copies = 3): number | null {
  if (count <= 0 || copies < 2) {
    return null
  }
  const middleStart = count
  const middleEnd = count * (copies - 1) - 1
  if (rawIndex < middleStart) {
    return count
  }
  if (rawIndex > middleEnd) {
    return -count
  }
  return null
}
