import { describe, expect, it } from 'vitest'

import { loopJump, normalizeIndex } from '@/lib/carousel'

describe('normalizeIndex', () => {
  it('mapeia índices válidos direto', () => {
    expect(normalizeIndex(0, 6)).toBe(0)
    expect(normalizeIndex(5, 6)).toBe(5)
  })

  it('faz loop para frente além do fim', () => {
    expect(normalizeIndex(6, 6)).toBe(0)
    expect(normalizeIndex(11, 6)).toBe(5)
  })

  it('faz loop para trás com índices negativos', () => {
    expect(normalizeIndex(-1, 6)).toBe(5)
    expect(normalizeIndex(-7, 6)).toBe(5)
  })

  it('não quebra com lista vazia', () => {
    expect(normalizeIndex(3, 0)).toBe(0)
  })
})

describe('loopJump', () => {
  it('não salta dentro da cópia do meio (índices N..2N-1)', () => {
    expect(loopJump(6, 6)).toBeNull()
    expect(loopJump(11, 6)).toBeNull()
  })

  it('salta para frente ao sair pela esquerda', () => {
    expect(loopJump(5, 6)).toBe(6)
    expect(loopJump(0, 6)).toBe(6)
  })

  it('salta para trás ao sair pela direita', () => {
    expect(loopJump(12, 6)).toBe(-6)
    expect(loopJump(17, 6)).toBe(-6)
  })

  it('funciona com um único item', () => {
    expect(loopJump(0, 1)).toBe(1)
    expect(loopJump(1, 1)).toBeNull()
    expect(loopJump(2, 1)).toBe(-1)
  })

  it('não quebra com lista vazia', () => {
    expect(loopJump(0, 0)).toBeNull()
  })
})
