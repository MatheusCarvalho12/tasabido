import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TracingEngine } from './engine'
import { getGlyphGeometry } from './geometry'
import type { TracingEvidenceV1 } from './types'

describe('TracingEngine (Ticket A1)', () => {
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
    it('resets immediately on invalid lift (pointerup before threshold)', () => {
      let resetCalled = false
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        completionThreshold: 0.75,
        clock,
        onReset: () => {
          resetCalled = true
        },
      })

      expect(engine.getState()).toBe('ready')

      // Pointer down at start of L: (0.25, 0.15)
      engine.handlePointerDown(0.25, 0.15, 1)
      expect(engine.getState()).toBe('drawing')

      // Draw only a tiny bit (not enough to complete)
      virtualTime += 100
      engine.handlePointerMove(0.25, 0.25, 1)
      expect(engine.getScore().overall).toBeLessThan(0.75)

      // Invalid lift (pointer up before threshold)
      engine.handlePointerUp(0.25, 0.25, 1)
      expect(resetCalled).toBe(true)
      expect(engine.getState()).toBe('reset')
      expect(engine.getStrokes().length).toBe(0)
      expect(engine.getScore().overall).toBe(0)

      // Advances timer for reset transition back to ready
      vi.advanceTimersByTime(200)
      expect(engine.getState()).toBe('ready')
    })

    it('transitions to valid_touching when score >= threshold while still touching', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        completionThreshold: 0.75,
        clock,
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

      // Current score >= threshold while pointer is still down
      expect(engine.getScore().overall).toBeGreaterThanOrEqual(0.75)
      expect(engine.getState()).toBe('valid_touching')
      expect(engine.getIsLocked()).toBe(false)

      // Completes ONLY on release
      let completedEvidence: TracingEvidenceV1 | null = null
      const engineWithCallback = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        completionThreshold: 0.75,
        clock,
        onComplete: (ev) => {
          completedEvidence = ev
        },
      })

      engineWithCallback.handlePointerDown(0.25, 0.15, 1)
      for (let y = 0.2; y <= 0.85; y += 0.05) {
        virtualTime += 20
        engineWithCallback.handlePointerMove(0.25, y, 1)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        virtualTime += 20
        engineWithCallback.handlePointerMove(x, 0.85, 1)
      }

      expect(completedEvidence).toBeNull()

      // Pointer up releases and triggers completion!
      engineWithCallback.handlePointerUp(0.75, 0.85, 1)
      expect(engineWithCallback.getState()).toBe('completed')
      expect(engineWithCallback.getIsLocked()).toBe(true)
      expect(completedEvidence).not.toBeNull()
      expect((completedEvidence as unknown as TracingEvidenceV1)?.isCompleted).toBe(true)

      // Completed glyph is locked: further touches are rejected
      const accepted = engineWithCallback.handlePointerDown(0.5, 0.5, 2)
      expect(accepted).toBe(false)
    })
  })

  describe('timed_pause mode', () => {
    it('enters grace on lift and resets only when grace expires', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'timed_pause',
        graceDurationMs: 1000,
        completionThreshold: 0.75,
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      virtualTime += 100
      engine.handlePointerMove(0.25, 0.4, 1)

      // Lift before threshold
      engine.handlePointerUp(0.25, 0.4, 1)

      // Should be in grace period (progress preserved)
      expect(engine.getState()).toBe('grace')
      expect(engine.getStrokes().length).toBe(1)

      // Advance time beyond grace duration (1000ms)
      vi.advanceTimersByTime(1100)
      expect(engine.getState()).toBe('reset')
      expect(engine.getStrokes().length).toBe(0)
    })

    it('resumes drawing and cancels grace when child touches down before grace expires', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'timed_pause',
        graceDurationMs: 1000,
        completionThreshold: 0.75,
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      virtualTime += 50
      engine.handlePointerMove(0.25, 0.45, 1)
      engine.handlePointerUp(0.25, 0.45, 1)

      expect(engine.getState()).toBe('grace')

      // Child touches down again after 400ms (within grace)
      vi.advanceTimersByTime(400)
      virtualTime += 400
      engine.handlePointerDown(0.25, 0.45, 2)

      expect(engine.getState()).toBe('drawing')
      // Both previous stroke and active stroke are kept
      expect(engine.getStrokes().length).toBe(1)

      // Continue to completion
      for (let y = 0.5; y <= 0.85; y += 0.05) {
        virtualTime += 20
        engine.handlePointerMove(0.25, y, 2)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        virtualTime += 20
        engine.handlePointerMove(x, 0.85, 2)
      }

      engine.handlePointerUp(0.75, 0.85, 2)
      expect(engine.getState()).toBe('completed')
    })
  })

  describe('free mode', () => {
    it('accumulates strokes across multiple contacts without reset on lift', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'free',
        completionThreshold: 0.75,
        clock,
      })

      // Stroke 1: top half of vertical stem
      engine.handlePointerDown(0.25, 0.15, 1)
      engine.handlePointerMove(0.25, 0.5, 1)
      engine.handlePointerUp(0.25, 0.5, 1)

      expect(engine.getState()).toBe('ready')
      expect(engine.getStrokes().length).toBe(1)
      const score1 = engine.getScore().overall
      expect(score1).toBeGreaterThan(0)

      // Stroke 2: bottom half of vertical stem + bottom horizontal bar
      virtualTime += 300
      engine.handlePointerDown(0.25, 0.5, 2)
      for (let y = 0.55; y <= 0.85; y += 0.05) {
        engine.handlePointerMove(0.25, y, 2)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        engine.handlePointerMove(x, 0.85, 2)
      }

      engine.handlePointerUp(0.75, 0.85, 2)

      expect(engine.getState()).toBe('completed')
      expect(engine.getStrokes().length).toBe(2)
    })
  })

  describe('active pointer lock', () => {
    it('rejects secondary pointer touches while primary pointer is active', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        clock,
      })

      const p1 = engine.handlePointerDown(0.25, 0.15, 10)
      expect(p1).toBe(true)
      expect(engine.getActivePointerId()).toBe(10)

      // Secondary touch
      const p2 = engine.handlePointerDown(0.5, 0.5, 20)
      expect(p2).toBe(false)
      expect(engine.getActivePointerId()).toBe(10)

      // Move from secondary pointer is ignored
      const m2 = engine.handlePointerMove(0.6, 0.6, 20)
      expect(m2).toBe(false)

      // Move from primary pointer is processed
      const m1 = engine.handlePointerMove(0.25, 0.3, 10)
      expect(m1).toBe(true)
    })
  })

  describe('interruptions: pointercancel and lostcapture', () => {
    it('handles pointercancel cleanly in strict mode', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      engine.handlePointerMove(0.25, 0.3, 1)
      engine.handlePointerCancel(1)

      expect(engine.getActivePointerId()).toBeNull()
      expect(engine.getState()).toBe('reset')
    })

    it('handles lostpointercapture cleanly in timed mode', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'timed_pause',
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      engine.handlePointerMove(0.25, 0.3, 1)
      engine.handleLostPointerCapture(1)

      expect(engine.getActivePointerId()).toBeNull()
      expect(engine.getState()).toBe('grace')
    })
  })

  describe('serializable evidence schema v1', () => {
    it('generates valid JSON-serializable evidence schema v1', () => {
      const engine = new TracingEngine({
        glyph: glyphL,
        mode: 'strict_continuous',
        sessionId: 'test_session_123',
        clock,
      })

      engine.handlePointerDown(0.25, 0.15, 1)
      for (let y = 0.2; y <= 0.85; y += 0.05) {
        engine.handlePointerMove(0.25, y, 1)
      }
      for (let x = 0.3; x <= 0.75; x += 0.05) {
        engine.handlePointerMove(x, 0.85, 1)
      }
      engine.handlePointerUp(0.75, 0.85, 1)

      const evidence = engine.getEvidence()

      expect(evidence.schemaVersion).toBe('v1')
      expect(evidence.sessionId).toBe('test_session_123')
      expect(evidence.glyphId).toBe('L')
      expect(evidence.character).toBe('L')
      expect(evidence.mode).toBe('strict_continuous')
      expect(evidence.isCompleted).toBe(true)
      expect(evidence.events.length).toBeGreaterThan(0)
      expect(evidence.strokes.length).toBe(1)
      expect(evidence.scoreHistory.length).toBeGreaterThan(0)

      // Test JSON serializability
      const json = JSON.stringify(evidence)
      expect(json).toBeTruthy()
      const parsed = JSON.parse(json)
      expect(parsed.schemaVersion).toBe('v1')
      expect(parsed.sessionId).toBe('test_session_123')
    })
  })
})
