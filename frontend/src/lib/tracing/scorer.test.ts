import { describe, expect, it } from 'vitest'
import { getGlyphGeometry } from './geometry'
import { calculateLiveScore } from './scorer'
import type { TracingStroke } from './types'

describe('tracing scorer', () => {
  const glyphI = getGlyphGeometry('I')

  it('returns 0 coverage and score for empty strokes', () => {
    const score = calculateLiveScore([], glyphI, 0)
    expect(score.coverage).toBe(0)
    expect(score.overall).toBe(0)
  })

  it('increases coverage as points are drawn along the guide path', () => {
    // Top stem point of I (around 0.5, 0.15 to 0.5, 0.85)
    const partialStroke: TracingStroke = {
      id: 's1',
      points: [
        { x: 0.5, y: 0.15, timestampMs: 0 },
        { x: 0.5, y: 0.3, timestampMs: 50 },
      ],
      startedAtMs: 0,
      endedAtMs: null,
      isComplete: false,
      outOfBoundsCount: 0,
    }

    const initialScore = calculateLiveScore([partialStroke], glyphI, 100)
    expect(initialScore.coverage).toBeGreaterThan(0)
    expect(initialScore.precision).toBeGreaterThan(0.8)

    // Complete stem of I
    const fullStroke: TracingStroke = {
      id: 's1',
      points: [
        { x: 0.5, y: 0.15, timestampMs: 0 },
        { x: 0.5, y: 0.3, timestampMs: 50 },
        { x: 0.5, y: 0.5, timestampMs: 100 },
        { x: 0.5, y: 0.7, timestampMs: 150 },
        { x: 0.5, y: 0.85, timestampMs: 200 },
        { x: 0.3, y: 0.15, timestampMs: 250 },
        { x: 0.7, y: 0.15, timestampMs: 300 },
        { x: 0.3, y: 0.85, timestampMs: 350 },
        { x: 0.7, y: 0.85, timestampMs: 400 },
      ],
      startedAtMs: 0,
      endedAtMs: 400,
      isComplete: true,
      outOfBoundsCount: 0,
    }

    const fullScore = calculateLiveScore([fullStroke], glyphI, 500)
    expect(fullScore.coverage).toBeGreaterThan(initialScore.coverage)
    expect(fullScore.overall).toBeGreaterThan(initialScore.overall)
  })

  it('lowers precision and overall score when straying far from the target line', () => {
    const goodStroke: TracingStroke = {
      id: 's1',
      points: [
        { x: 0.5, y: 0.15, timestampMs: 0 },
        { x: 0.5, y: 0.5, timestampMs: 100 },
      ],
      startedAtMs: 0,
      endedAtMs: null,
      isComplete: false,
      outOfBoundsCount: 0,
    }

    const goodScore = calculateLiveScore([goodStroke], glyphI, 100)

    // Add wild stray points far outside the letter (e.g. at (0.05, 0.95))
    const strayStroke: TracingStroke = {
      id: 's1',
      points: [
        ...goodStroke.points,
        { x: 0.05, y: 0.95, timestampMs: 200 },
        { x: 0.02, y: 0.98, timestampMs: 300 },
        { x: 0.01, y: 0.99, timestampMs: 400 },
      ],
      startedAtMs: 0,
      endedAtMs: null,
      isComplete: false,
      outOfBoundsCount: 0,
    }

    const strayScore = calculateLiveScore([strayStroke], glyphI, 400)
    expect(strayScore.precision).toBeLessThan(goodScore.precision)
    expect(strayScore.overall).toBeLessThan(goodScore.overall)
  })
})
