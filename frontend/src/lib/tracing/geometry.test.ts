import { describe, expect, it } from 'vitest'
import {
  calculatePolylineLength,
  distance,
  distanceSquared,
  getGlyphGeometry,
  isGlyphSupported,
  minDistanceToSamples,
  normalizeChildFirstName,
  sampleArc,
  sampleSegment,
  UnsupportedGlyphError,
  validateGlyphSequence,
} from './geometry'

describe('geometry utilities', () => {
  it('calculates distance and distanceSquared correctly', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 3, y: 4 }
    expect(distanceSquared(p1, p2)).toBe(25)
    expect(distance(p1, p2)).toBe(5)
  })

  it('calculates polyline length correctly', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 4 },
    ]
    expect(calculatePolylineLength(pts)).toBeCloseTo(7)
  })

  it('samples linear segments accurately', () => {
    const p1 = { x: 0, y: 0 }
    const p2 = { x: 10, y: 10 }
    const samples = sampleSegment(p1, p2, 5)
    expect(samples).toHaveLength(6)
    expect(samples[0]).toEqual({ x: 0, y: 0 })
    expect(samples[5]).toEqual({ x: 10, y: 10 })
    expect(samples[2].x).toBeCloseTo(4)
  })

  it('samples circular/elliptical arcs accurately', () => {
    const arc = sampleArc(0.5, 0.5, 0.2, 0.2, 0, 180, 4)
    expect(arc.length).toBe(5)
    expect(arc[0].x).toBeCloseTo(0.7)
    expect(arc[0].y).toBeCloseTo(0.5)
    expect(arc[4].x).toBeCloseTo(0.3)
    expect(arc[4].y).toBeCloseTo(0.5)
  })

  it('finds min distance to sample points', () => {
    const samples = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.9 },
    ]
    const p = { x: 0.5, y: 0.6 }
    const d = minDistanceToSamples(p, samples)
    expect(d).toBeCloseTo(0.1)
  })
})

describe('normalizeChildFirstName and glyph validation', () => {
  it('normalizes simple first names to uppercase NFC letters', () => {
    expect(normalizeChildFirstName('Maria')).toEqual(['M', 'A', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('maria silva')).toEqual(['M', 'A', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('pedro henrique')).toEqual(['P', 'E', 'D', 'R', 'O'])
  })

  it('preserves Brazilian Portuguese uppercase accents and Ü in MÜLLER', () => {
    expect(normalizeChildFirstName('Müller')).toEqual(['M', 'Ü', 'L', 'L', 'E', 'R'])
    expect(normalizeChildFirstName('João')).toEqual(['J', 'O', 'Ã', 'O'])
    expect(normalizeChildFirstName('Vitória')).toEqual(['V', 'I', 'T', 'Ó', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('Érica')).toEqual(['É', 'R', 'I', 'C', 'A'])
    expect(normalizeChildFirstName('Inês')).toEqual(['I', 'N', 'Ê', 'S'])
    expect(normalizeChildFirstName('André')).toEqual(['A', 'N', 'D', 'R', 'É'])
    expect(normalizeChildFirstName('Cauã')).toEqual(['C', 'A', 'U', 'Ã'])
    expect(normalizeChildFirstName('Luís')).toEqual(['L', 'U', 'Í', 'S'])
  })

  it('preserves full character sequence and validates against catalog without silent skipping', () => {
    // Unsupported character '9' or 'Ø' is NEVER silently dropped into 'MLLER'
    const normalizedWith9 = normalizeChildFirstName('M9ller')
    expect(normalizedWith9).toEqual(['M', '9', 'L', 'L', 'E', 'R'])
    const validation9 = validateGlyphSequence(normalizedWith9)
    expect(validation9.isValid).toBe(false)
    expect(validation9.unsupported).toEqual(['9'])

    const normalizedWithNordic = normalizeChildFirstName('Møller')
    expect(normalizedWithNordic).toEqual(['M', 'Ø', 'L', 'L', 'E', 'R'])
    const validationNordic = validateGlyphSequence(normalizedWithNordic)
    expect(validationNordic.isValid).toBe(false)
    expect(validationNordic.unsupported).toEqual(['Ø'])
  })

  it('returns empty array when name is empty or whitespace', () => {
    expect(normalizeChildFirstName('')).toEqual([])
    expect(normalizeChildFirstName(null)).toEqual([])
    expect(normalizeChildFirstName('   ')).toEqual([])
  })
})

describe('canonical glyph catalog', () => {
  it('provides geometry for all A-Z letters and Ü with exact 0.70 threshold', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÜ'.split('')
    for (const letter of alphabet) {
      expect(isGlyphSupported(letter)).toBe(true)
      const geom = getGlyphGeometry(letter)
      expect(geom.character).toBe(letter)
      expect(geom.completionThreshold).toBe(0.7)
      expect(geom.totalTargetLength).toBeGreaterThan(0)
      expect(geom.strokes.length).toBeGreaterThan(0)
    }
  })

  it('provides geometry for accented uppercase Brazilian letters', () => {
    const accentedLetters = ['Á', 'À', 'Â', 'Ã', 'É', 'Ê', 'Í', 'Ó', 'Ô', 'Õ', 'Ú', 'Ç', 'Ü']
    for (const letter of accentedLetters) {
      expect(isGlyphSupported(letter)).toBe(true)
      const geom = getGlyphGeometry(letter)
      expect(geom.character).toBe(letter)
      expect(geom.completionThreshold).toBe(0.7)
      expect(geom.strokes.length).toBeGreaterThan(1)
    }
  })

  it('throws UnsupportedGlyphError for unknown/unsupported characters', () => {
    expect(isGlyphSupported('9')).toBe(false)
    expect(isGlyphSupported('Ø')).toBe(false)
    expect(isGlyphSupported('?')).toBe(false)
    expect(() => getGlyphGeometry('9')).toThrow(UnsupportedGlyphError)
    expect(() => getGlyphGeometry('Ø')).toThrow(UnsupportedGlyphError)
  })
})
