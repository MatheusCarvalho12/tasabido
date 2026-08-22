import { describe, expect, it } from 'vitest'
import {
  calculatePolylineLength,
  distance,
  distanceSquared,
  getGlyphGeometry,
  minDistanceToSamples,
  normalizeChildFirstName,
  sampleArc,
  sampleSegment,
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

describe('normalizeChildFirstName', () => {
  it('normalizes simple first names to uppercase letters', () => {
    expect(normalizeChildFirstName('Maria')).toEqual(['M', 'A', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('maria silva')).toEqual(['M', 'A', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('pedro henrique')).toEqual(['P', 'E', 'D', 'R', 'O'])
  })

  it('preserves Brazilian Portuguese uppercase accents', () => {
    expect(normalizeChildFirstName('João')).toEqual(['J', 'O', 'Ã', 'O'])
    expect(normalizeChildFirstName('Vitória')).toEqual(['V', 'I', 'T', 'Ó', 'R', 'I', 'A'])
    expect(normalizeChildFirstName('Érica')).toEqual(['É', 'R', 'I', 'C', 'A'])
    expect(normalizeChildFirstName('Inês')).toEqual(['I', 'N', 'Ê', 'S'])
    expect(normalizeChildFirstName('André')).toEqual(['A', 'N', 'D', 'R', 'É'])
    expect(normalizeChildFirstName('Cauã')).toEqual(['C', 'A', 'U', 'Ã'])
    expect(normalizeChildFirstName('Luís')).toEqual(['L', 'U', 'Í', 'S'])
  })

  it('returns empty array when name is empty or invalid (no invented fallback names)', () => {
    expect(normalizeChildFirstName('')).toEqual([])
    expect(normalizeChildFirstName(null)).toEqual([])
    expect(normalizeChildFirstName('123')).toEqual([])
    expect(normalizeChildFirstName('   ')).toEqual([])
  })
})

describe('canonical glyph definitions', () => {
  it('provides geometry for all A-Z letters with exact 0.70 threshold', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    for (const letter of alphabet) {
      const geom = getGlyphGeometry(letter)
      expect(geom.character).toBe(letter)
      expect(geom.completionThreshold).toBe(0.7)
      expect(geom.totalTargetLength).toBeGreaterThan(0)
      expect(geom.strokes.length).toBeGreaterThan(0)
    }
  })

  it('provides geometry for accented uppercase Brazilian letters', () => {
    const accentedLetters = ['Á', 'À', 'Â', 'Ã', 'É', 'Ê', 'Í', 'Ó', 'Ô', 'Õ', 'Ú', 'Ç']
    for (const letter of accentedLetters) {
      const geom = getGlyphGeometry(letter)
      expect(geom.character).toBe(letter)
      expect(geom.completionThreshold).toBe(0.7)
      expect(geom.strokes.length).toBeGreaterThan(1)
    }
  })
})
