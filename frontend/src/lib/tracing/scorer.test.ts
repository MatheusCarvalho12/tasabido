import { describe, expect, it } from 'vitest'
import { getGlyphGeometry } from './geometry'
import { calculateEngagement, calculateLiveScore } from './scorer'
import type { TracingStroke } from './types'

describe('tracing scorer (Ticket A1 frozen v1 formula)', () => {
  const glyphL = getGlyphGeometry('L')

  it('returns 0 coverage and score for empty strokes', () => {
    const score = calculateLiveScore([], glyphL)
    expect(score.coverage).toBe(0)
    expect(score.precision).toBe(1)
    expect(score.engagement).toBe(0)
    expect(score.overall).toBe(0)
  })

  it('calculates score based on multiplicative formula overall = coverage * precision * engagement', () => {
    // Valid stroke along L: vertical stem from (0.25, 0.15) to (0.25, 0.85) then horizontal (0.25, 0.85) to (0.75, 0.85)
    const strokePoints = []
    for (let y = 0.15; y <= 0.85; y += 0.05) {
      strokePoints.push({
        x: 0.25,
        y: Math.round(y * 100) / 100,
        timestampMs: strokePoints.length * 20,
      })
    }
    for (let x = 0.3; x <= 0.75; x += 0.05) {
      strokePoints.push({
        x: Math.round(x * 100) / 100,
        y: 0.85,
        timestampMs: strokePoints.length * 20,
      })
    }

    const stroke: TracingStroke = {
      id: 's1',
      glyphIndex: 0,
      segmentIndex: 1,
      points: strokePoints,
      startedAtMs: 0,
      endedAtMs: strokePoints.length * 20,
      isComplete: true,
      status: 'completed',
      outOfBoundsCount: 0,
    }

    const score = calculateLiveScore([stroke], glyphL)
    expect(score.coverage).toBeGreaterThanOrEqual(0.7)
    expect(score.precision).toBeGreaterThanOrEqual(0.85)
    expect(score.engagement).toBe(1.0)
    expect(score.overall).toBeCloseTo(score.coverage * score.precision * score.engagement, 2)
    expect(score.overall).toBeGreaterThanOrEqual(0.7)
  })

  it('prevents scribble-all from passing threshold 0.70 by penalizing precision', () => {
    // Scribble across entire screen covering everything but with massive stray length
    const scribblePoints = []
    for (let x = 0; x <= 1.0; x += 0.05) {
      for (let y = 0; y <= 1.0; y += 0.1) {
        scribblePoints.push({ x, y, timestampMs: scribblePoints.length * 10 })
      }
    }

    const scribbleStroke: TracingStroke = {
      id: 'scribble_1',
      glyphIndex: 0,
      segmentIndex: 1,
      points: scribblePoints,
      startedAtMs: 0,
      endedAtMs: scribblePoints.length * 10,
      isComplete: true,
      status: 'completed',
      outOfBoundsCount: 0,
    }

    const score = calculateLiveScore([scribbleStroke], glyphL)
    // Coverage might be high due to screen-wide touch
    expect(score.coverage).toBeGreaterThan(0.5)
    // But precision is decimated due to massive out-of-corridor trace length
    expect(score.precision).toBeLessThan(0.3)
    // Resulting multiplicative score CANNOT pass threshold 0.70!
    expect(score.overall).toBeLessThan(0.7)
  })

  it('calculates engagement as valid trace length / (target length * 0.25) capped at 1.0', () => {
    // Short stroke of 0.1 length inside target corridor (where target length of L is ~1.2)
    const shortStroke: TracingStroke = {
      id: 'short',
      glyphIndex: 0,
      segmentIndex: 1,
      points: [
        { x: 0.25, y: 0.15, timestampMs: 0 },
        { x: 0.25, y: 0.25, timestampMs: 50 },
      ],
      startedAtMs: 0,
      endedAtMs: 50,
      isComplete: false,
      status: 'active',
      outOfBoundsCount: 0,
    }

    const engagement = calculateEngagement([shortStroke], glyphL)
    expect(engagement).toBeGreaterThan(0)
    expect(engagement).toBeLessThan(1.0)
  })
})
