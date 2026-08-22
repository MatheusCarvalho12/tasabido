import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TracingEngine } from './engine'
import { getGlyphGeometry } from './geometry'
import type { TracingEvidenceV1 } from './types'

describe('TracingEngine (Ticket A1 Frozen v1)', () => {
  let virtualTime = 1000
  const clock = () => virtualTime
  const glyphL = getGlyphGeometry('L')

  beforeEach(() => {
    virtualTime = 1000
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('strict_continuous mode', () => {
    it('resets immediately on invalid lift (pointerup before threshold 0.70)', () => {
      let resetCalled = false
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        completionThreshold: 0.7,
        clock,
        onReset: () => {
          resetCalled = true
        },
      })

      expect(engine.getState()).toBe('ready')

      // Pointer down at start of L: (0.25, 0.15)
      engine.handlePointerDown(0.25, 0.15, 1)
      expect(engine.getState()).toBe('drawing')

      // Draw only a tiny bit (not reaching 0.70 threshold)
      virtualTime += 100
      engine.handlePointerMove(0.25, 0.25, 1)
      expect(engine.getScore().overall).toBeLessThan(0.7)

      // Invalid lift (pointer up before threshold)
      engine.handlePointerUp(0.25, 0.25, 1)
      expect(resetCalled).toBe(true)
      expect(engine.getState()).toBe('reset')
      // Active strokes reset to 0, but stroke history is preserved for replay
      expect(engine.getStrokes().length).toBe(0)
      expect(engine.getAllStrokesHistory().length).toBe(1)
      expect(engine.getScore().overall).toBe(0)

      // Advances timer for reset transition back to ready
      vi.advanceTimersByTime(200)
      expect(engine.getState()).toBe('ready')
    })

    it('transitions to valid_touching when score >= 0.70 while still touching', () => {
      let completedEvidence: TracingEvidenceV1 | null = null
      const engine = new TracingEngine({
        glyph: glyphL,
        glyphIndex: 0,
        mode: 'strict_continuous',
        completionThreshold: 0.7,
        clock,
        onComplete: (ev) => {
          completedEvidence = ev
        },
      })

      engine.handlePointerDown(0.25, 0.15, 1)

      // Trace the full L: from (0.25, 0.15) down to (0.25, 0.85) then across to (0.75, 0.85)
      for (let y = 0.2; y <= 0.85; y += 0.05) {
        virtualTime += 20
        engine.handlePointerMove(0.25, y, 1)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        virtualTime += 20
        engine.handlePointerMove(x, 0.85, 1)
      }

      // Current score >= 0.70 while pointer is still down
      expect(engine.getScore().overall).toBeGreaterThanOrEqual(0.7)
      expect(engine.getState()).toBe('valid_touching')
      expect(engine.getIsLocked()).toBe(false)
      expect(completedEvidence).toBeNull()

      // Pointer up releases and triggers completion!
      engine.handlePointerUp(0.75, 0.85, 1)
      expect(engine.getState()).toBe('completed')
      expect(engine.getIsLocked()).toBe(true)
      expect(completedEvidence).not.toBeNull()
      expect((completedEvidence as unknown as TracingEvidenceV1)?.isCompleted).toBe(true)

      // Completed glyph is locked: further touches are rejected
      const accepted = engine.handlePointerDown(0.5, 0.5, 2)
      expect(accepted).toBe(false)
    })
  })

  describe('interruptions: pointercancel and lostpointercapture are NON-COMPLETING', () => {
    it('never completes on pointercancel even if live score is above threshold', () => {
      let completedCalled = false
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        completionThreshold: 0.7,
        clock,
        onComplete: () => {
          completedCalled = true
        },
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      for (let y = 0.2; y <= 0.85; y += 0.05) {
        engine.handlePointerMove(0.25, y, 1)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        engine.handlePointerMove(x, 0.85, 1)
      }

      expect(engine.getScore().overall).toBeGreaterThanOrEqual(0.7)
      expect(engine.getState()).toBe('valid_touching')

      // Interruption occurs via pointercancel
      engine.handlePointerCancel(1)

      // MUST NOT complete!
      expect(completedCalled).toBe(false)
      expect(engine.getState()).toBe('reset')
      expect(engine.getIsLocked()).toBe(false)
    })

    it('never completes on lostpointercapture even if live score is above threshold', () => {
      let completedCalled = false
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'timed_pause',
        completionThreshold: 0.7,
        clock,
        onComplete: () => {
          completedCalled = true
        },
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      for (let y = 0.2; y <= 0.85; y += 0.05) {
        engine.handlePointerMove(0.25, y, 1)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        engine.handlePointerMove(x, 0.85, 1)
      }

      expect(engine.getScore().overall).toBeGreaterThanOrEqual(0.7)

      // Interruption occurs via lostpointercapture
      engine.handleLostPointerCapture(1)

      // MUST NOT complete; enters grace in timed mode
      expect(completedCalled).toBe(false)
      expect(engine.getState()).toBe('grace')
      expect(engine.getIsLocked()).toBe(false)
    })
  })

  describe('monotonic event sequence and structured fields', () => {
    it('produces strictly monotonic seq numbers and includes glyphIndex and segmentIndex', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        glyphIndex: 2,
        mode: 'strict_continuous',
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      engine.handlePointerMove(0.25, 0.3, 1)
      engine.handlePointerMove(0.25, 0.5, 1)
      engine.handlePointerUp(0.25, 0.5, 1)

      const evidence = engine.getEvidence()
      expect(evidence.events.length).toBeGreaterThan(0)

      let prevSeq = 0
      for (const ev of evidence.events) {
        expect(ev.seq).toBe(prevSeq + 1)
        prevSeq = ev.seq
        expect(ev.glyphIndex).toBe(2)
        expect(ev.segmentIndex).toBeGreaterThan(0)
      }

      expect(evidence.schemaVersion).toBe('v1')
      expect(evidence.scoringVersion).toBe('v1')
    })
  })

  describe('abandonment and partial evidence bundle', () => {
    it('preserves faithful partial evidence on explicit abandon', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        glyphIndex: 1,
        mode: 'timed_pause',
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      engine.handlePointerMove(0.25, 0.4, 1)

      const partialEvidence = engine.abandon()
      expect(partialEvidence.status).toBe('abandoned')
      expect(partialEvidence.isCompleted).toBe(false)
      expect(partialEvidence.strokes.length).toBe(1)
      expect(partialEvidence.strokes[0].status).toBe('abandoned')
      expect(partialEvidence.events.some((e) => e.type === 'abandon')).toBe(true)
    })
  })
})
