import { describe, expect, it } from 'vitest'

import {
  categoriaLabel,
  formatCompactCount,
  formatPartidas,
  formatPlaysLabel,
  formatScore,
  formatScoreStars,
  formatTempoMedio,
} from '@/lib/games'

describe('formatCompactCount', () => {
  it('formata números abaixo de mil sem sufixo', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(7)).toBe('7')
    expect(formatCompactCount(999)).toBe('999')
  })

  it('formata milhares com vírgula pt-BR', () => {
    expect(formatCompactCount(2100)).toBe('2,1 mil')
    expect(formatCompactCount(1500)).toBe('1,5 mil')
  })

  it('omite a casa decimal quando inteiro', () => {
    expect(formatCompactCount(12_000)).toBe('12 mil')
    expect(formatCompactCount(1_000)).toBe('1 mil')
  })

  it('formata milhões com sufixo mi', () => {
    expect(formatCompactCount(1_234_567)).toBe('1,2 mi')
    expect(formatCompactCount(10_000_000)).toBe('10 mi')
  })
})

describe('formatPartidas', () => {
  it('usa o formato compacto pt-BR', () => {
    expect(formatPartidas(2100)).toBe('2,1 mil')
    expect(formatPartidas(0)).toBe('0')
  })
})

describe('formatScoreStars', () => {
  it('converte a nota 0-100 para a escala de 5 estrelas', () => {
    expect(formatScoreStars(96)).toBe('4,8')
    expect(formatScoreStars(87)).toBe('4,4')
    expect(formatScoreStars(100)).toBe('5')
    expect(formatScoreStars(0)).toBe('0')
  })

  it('arredonda para uma casa decimal', () => {
    expect(formatScoreStars(84)).toBe('4,2')
    expect(formatScoreStars(83)).toBe('4,2')
  })

  it('limita fora da faixa válida', () => {
    expect(formatScoreStars(-10)).toBe('0')
    expect(formatScoreStars(120)).toBe('5')
  })
})

describe('formatScore', () => {
  it('formata a pontuação média em percentual', () => {
    expect(formatScore(87)).toBe('87%')
    expect(formatScore(100)).toBe('100%')
    expect(formatScore(0)).toBe('0%')
  })

  it('limita fora da faixa válida', () => {
    expect(formatScore(-5)).toBe('0%')
    expect(formatScore(150)).toBe('100%')
  })
})

describe('formatTempoMedio', () => {
  it('formata em minutos', () => {
    expect(formatTempoMedio(12)).toBe('12 min')
    expect(formatTempoMedio(0)).toBe('0 min')
    expect(formatTempoMedio(1.4)).toBe('1 min')
  })
})

describe('formatPlaysLabel', () => {
  it('usa singular para uma partida e plural para o resto', () => {
    expect(formatPlaysLabel(1)).toBe('1 jogada')
    expect(formatPlaysLabel(2100)).toBe('2,1 mil jogadas')
    expect(formatPlaysLabel(0)).toBe('0 jogadas')
  })
})

describe('categoriaLabel', () => {
  it('traduz categorias conhecidas do contrato', () => {
    expect(categoriaLabel('escrita')).toBe('Escrita')
    expect(categoriaLabel('coordenacao-motora')).toBe('Coordenação motora')
    expect(categoriaLabel('coordenacao_motora')).toBe('Coordenação motora')
  })

  it('humaniza categoria desconhecida como fallback', () => {
    expect(categoriaLabel('jogo-novo')).toBe('Jogo Novo')
  })
})
