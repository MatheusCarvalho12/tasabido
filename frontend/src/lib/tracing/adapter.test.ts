import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchChildAssignmentOverrideApi,
  fetchLinkedChildrenApi,
  fetchTracingRunsListApi,
  getLocalSessionEvidences,
  resetChildAssignmentOverrideApi,
  saveChildAssignmentOverrideApi,
  saveSessionEvidence,
} from './adapter'
import {
  CANONICAL_GLYPH_SET_HASH,
  CANONICAL_GLYPH_SET_ID,
  CANONICAL_GLYPH_SET_VERSION,
  type TracingSessionEvidenceV1,
} from './types'

describe('Tracing Adapter (Ticket A4 / A5 typed boundaries)', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('fetchLinkedChildrenApi returns empty array by default (no invented children)', async () => {
    const children = await fetchLinkedChildrenApi()
    expect(children).toEqual([])
  })

  it('getLocalSessionEvidences and fetchTracingRunsListApi return empty array when no sessions recorded', async () => {
    expect(getLocalSessionEvidences()).toEqual([])
    const runs = await fetchTracingRunsListApi()
    expect(runs).toEqual([])
  })

  it('saves and retrieves real session evidence without fallbacks', async () => {
    const session: TracingSessionEvidenceV1 = {
      schemaVersion: 'v1',
      scoringVersion: 'v1',
      glyphSetId: CANONICAL_GLYPH_SET_ID,
      glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
      glyphSetHash: CANONICAL_GLYPH_SET_HASH,
      sessionId: 'session_real_test_001',
      childName: 'Mariana',
      mode: 'free',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 45000,
      glyphs: [],
    }

    saveSessionEvidence(session)

    const list = await fetchTracingRunsListApi()
    expect(list).toHaveLength(1)
    expect(list[0]?.sessionId).toBe('session_real_test_001')
    expect(list[0]?.childName).toBe('Mariana')
  })

  it('saves, retrieves, and resets child assignment overrides', async () => {
    const override = {
      childId: 'c-100',
      childName: 'Mariana',
      gameId: 42,
      glyphSetId: CANONICAL_GLYPH_SET_ID,
      mode: 'strict_continuous' as const,
      completionThreshold: 85,
      graceDurationSeconds: 0,
    }

    await saveChildAssignmentOverrideApi(override)
    const fetched = await fetchChildAssignmentOverrideApi('c-100', 42)
    expect(fetched).toEqual(override)

    await resetChildAssignmentOverrideApi('c-100', 42)
    const afterReset = await fetchChildAssignmentOverrideApi('c-100', 42)
    expect(afterReset).toBeNull()
  })
})
