import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api'
import {
  clearTransientEvidence,
  fetchAssignmentTracingConfigApi,
  fetchChildAssignmentOverrideApi,
  fetchGameTracingConfigApi,
  fetchGlyphSetsCatalogApi,
  fetchLinkedChildrenApi,
  fetchTracingRunDetailApi,
  fetchTracingRunReplayApi,
  fetchTracingRunsListApi,
  finalizeTracingRunApi,
  getTransientEvidence,
  resetChildAssignmentOverrideApi,
  saveChildAssignmentOverrideApi,
  saveTransientEvidence,
  startTracingRunApi,
  updateAssignmentTracingConfigApi,
  updateGameTracingConfigApi,
} from './adapter'
import {
  type BackendGlyphSetCatalogResponse,
  type BackendLinkedChildrenResponse,
  type BackendTracingRunOut,
  transformFrontendEventsToBackend,
  transformFrontendEvidencesToBackend,
} from './types'

describe('Tracing API Adapters (Ticket A5 - /api/tracing-runs)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('fetchGlyphSetsCatalogApi fetches catalog via GET /api/tracing-runs/glyph-sets', async () => {
    const mockCatalog: BackendGlyphSetCatalogResponse = {
      items: [
        {
          id: 1,
          version: 'uppercase-block-v1',
          artifact_sha256: 'sha256:abcd',
          sha256: 'sha256:abcd',
          artifact_path: 'svgs/glyphs/uppercase-block-v1.svg',
          style: 'uppercase-block',
          geometry: {
            A: [
              [
                [0.08, 1.0],
                [0.5, 0.0],
                [0.92, 1.0],
              ],
            ],
          },
          immutable: true,
        },
      ],
    }

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockCatalog,
      error: undefined,
      response: new Response(),
    })

    const result = await fetchGlyphSetsCatalogApi()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.version).toBe('uppercase-block-v1')
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/tracing-runs/glyph-sets',
      }),
    )
  })

  it('fetchGameTracingConfigApi and updateGameTracingConfigApi interact with /api/tracing-runs/config/{game_id}', async () => {
    const mockConfig = {
      game_id: 10,
      threshold: 70,
      contact_mode: 'timed_pause' as const,
      pause_grace_ms: 1500,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:1111',
      scoring_version: 1,
      schema_version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockConfig,
      error: undefined,
      response: new Response(),
    })

    const fetched = await fetchGameTracingConfigApi(10)
    expect(fetched.game_id).toBe(10)
    expect(fetched.threshold).toBe(70)

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: { ...mockConfig, threshold: 85 },
      error: undefined,
      response: new Response(),
    })

    const updated = await updateGameTracingConfigApi(10, { threshold: 85 })
    expect(updated.threshold).toBe(85)
    expect(apiClient.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/tracing-runs/config/10',
        body: { threshold: 85 },
      }),
    )
  })

  it('fetchAssignmentTracingConfigApi and updateAssignmentTracingConfigApi interact with /api/tracing-runs/assignments/{assignment_id}', async () => {
    const mockAssignment = {
      assignment_id: 42,
      game_id: 10,
      child_id: 'c-uuid-1',
      glyph_set_id_override: null,
      threshold_override: 80,
      contact_mode_override: 'free' as const,
      pause_grace_ms_override: null,
    }

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockAssignment,
      error: undefined,
      response: new Response(),
    })

    const fetched = await fetchAssignmentTracingConfigApi(42)
    expect(fetched.assignment_id).toBe(42)
    expect(fetched.threshold_override).toBe(80)

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: { ...mockAssignment, threshold_override: null },
      error: undefined,
      response: new Response(),
    })

    const updated = await updateAssignmentTracingConfigApi(42, { threshold_override: null })
    expect(updated.threshold_override).toBeNull()
  })

  it('fetchLinkedChildrenApi fetches linked children from /api/tracing-runs/children', async () => {
    const mockChildren: BackendLinkedChildrenResponse = {
      items: [
        {
          child_id: 'c-1',
          name: 'Lucas',
          assignments: [{ assignment_id: 101, game_id: 5 }],
        },
      ],
    }

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockChildren,
      error: undefined,
      response: new Response(),
    })

    const result = await fetchLinkedChildrenApi()
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Lucas')
    expect(result[0]?.assignments[0]?.assignment_id).toBe(101)
  })

  it('fetchTracingRunsListApi passes query params and returns list', async () => {
    const mockRuns = {
      items: [
        {
          id: 1,
          game_id: 5,
          child_id: 'c-1',
          status: 'completed' as const,
          score: 88,
          duration_seconds: 12,
          glyph_set_id: 1,
          glyph_set_version: 'uppercase-block-v1',
          glyph_set_sha256: 'sha256:1111',
          threshold: 70,
          contact_mode: 'timed_pause' as const,
          pause_grace_ms: 1500,
          scoring_version: 1,
          schema_version: 1,
          effective_config: {},
          glyph_sequence: ['A'],
        },
      ],
      limit: 50,
      offset: 0,
      has_more: false,
    }

    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockRuns,
      error: undefined,
      response: new Response(),
    })

    const list = await fetchTracingRunsListApi({ childId: 'c-1', limit: 10 })
    expect(list).toHaveLength(1)
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/tracing-runs',
        query: { child_id: 'c-1', limit: 10 },
      }),
    )
  })

  it('startTracingRunApi starts an authoritative run with POST /api/tracing-runs/start', async () => {
    const mockRun: BackendTracingRunOut = {
      id: 99,
      game_id: 5,
      child_id: 'c-1',
      status: 'started',
      score: null,
      duration_seconds: null,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:1111',
      threshold: 70,
      contact_mode: 'timed_pause',
      pause_grace_ms: 1500,
      scoring_version: 1,
      schema_version: 1,
      effective_config: { glyph_sequence: ['A'] },
      glyph_sequence: ['A'],
      glyph_set: {
        id: 1,
        version: 'uppercase-block-v1',
        artifact_sha256: 'sha256:1111',
        sha256: 'sha256:1111',
        artifact_path: 'svgs/glyphs/uppercase-block-v1.svg',
        style: 'uppercase-block',
        geometry: {
          A: [
            [
              [0.08, 1.0],
              [0.5, 0.0],
              [0.92, 1.0],
            ],
          ],
        },
        immutable: true,
      },
    }

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockRun,
      error: undefined,
      response: new Response(),
    })

    const started = await startTracingRunApi({ child_id: 'c-1' })
    expect(started.id).toBe(99)
    expect(started.status).toBe('started')
    expect(apiClient.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/tracing-runs/start',
        body: { child_id: 'c-1' },
      }),
    )
  })

  it('finalizeTracingRunApi finalizes run with POST /api/tracing-runs/{run_id}/finalize and clears transient storage', async () => {
    saveTransientEvidence('test_1', { hello: 'world' })
    expect(getTransientEvidence('test_1')).toEqual({ hello: 'world' })

    const mockFinalized: BackendTracingRunOut = {
      id: 99,
      game_id: 5,
      child_id: 'c-1',
      status: 'completed',
      score: 95,
      duration_seconds: 20,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:1111',
      threshold: 70,
      contact_mode: 'timed_pause',
      pause_grace_ms: 1500,
      scoring_version: 1,
      schema_version: 1,
      effective_config: {},
      glyph_sequence: ['A'],
    }

    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockFinalized,
      error: undefined,
      response: new Response(),
    })

    const finalized = await finalizeTracingRunApi(99, {
      idempotency_key: 'idemp-123',
      evidence: {
        artifact_version: 'uppercase-block-v1',
        artifact_sha256: 'sha256:1111',
        pause_grace_ms: 1500,
        events: [],
        glyphs: [],
        status: 'completed',
      },
    })

    expect(finalized.status).toBe('completed')
    expect(getTransientEvidence('test_1')).toBeNull()
  })

  it('fetchTracingRunDetailApi and fetchTracingRunReplayApi load details and replay data', async () => {
    const mockDetail: BackendTracingRunOut = {
      id: 99,
      game_id: 5,
      child_id: 'c-1',
      status: 'completed',
      score: 90,
      duration_seconds: 15,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:1111',
      threshold: 70,
      contact_mode: 'timed_pause',
      pause_grace_ms: 1500,
      scoring_version: 1,
      schema_version: 1,
      effective_config: {},
      glyph_sequence: ['A'],
    }

    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({
        data: mockDetail,
        error: undefined,
        response: new Response(),
      })
      .mockResolvedValueOnce({
        data: {
          ...mockDetail,
          evidence: {
            artifact_version: 'uppercase-block-v1',
            artifact_sha256: 'sha256:1111',
            pause_grace_ms: 1500,
            events: [],
            glyphs: [],
            status: 'completed',
          },
        },
        error: undefined,
        response: new Response(),
      })

    const detail = await fetchTracingRunDetailApi(99)
    expect(detail.id).toBe(99)

    const replay = await fetchTracingRunReplayApi(99)
    expect(replay.evidence).toBeDefined()
  })

  it('fetchChildAssignmentOverrideApi, saveChildAssignmentOverrideApi, and resetChildAssignmentOverrideApi work with real assignment IDs', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: {
        assignment_id: 10,
        game_id: 1,
        child_id: 'c-1',
        glyph_set_id_override: 1,
        threshold_override: 75,
        contact_mode_override: 'strict_continuous' as const,
        pause_grace_ms_override: 0,
      },
      error: undefined,
      response: new Response(),
    })

    const fetched = await fetchChildAssignmentOverrideApi('c-1', 1, 10)
    expect(fetched?.completionThreshold).toBe(75)

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: {
        assignment_id: 10,
        game_id: 1,
        child_id: 'c-1',
        glyph_set_id_override: 1,
        threshold_override: 80,
        contact_mode_override: 'free' as const,
        pause_grace_ms_override: 2000,
      },
      error: undefined,
      response: new Response(),
    })

    const saved = await saveChildAssignmentOverrideApi({
      childId: 'c-1',
      childName: 'Lucas',
      gameId: 1,
      assignmentId: 10,
      glyphSetId: '1',
      mode: 'free',
      completionThreshold: 80,
      graceDurationSeconds: 2.0,
    })
    expect(saved.completionThreshold).toBe(80)

    vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
      data: {
        assignment_id: 10,
        game_id: 1,
        child_id: 'c-1',
        glyph_set_id_override: null,
        threshold_override: null,
        contact_mode_override: null,
        pause_grace_ms_override: null,
      },
      error: undefined,
      response: new Response(),
    })

    await resetChildAssignmentOverrideApi('c-1', 1, 10)
    expect(apiClient.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/tracing-runs/assignments/10',
        body: {
          glyph_set_id_override: null,
          threshold_override: null,
          contact_mode_override: null,
          pause_grace_ms_override: null,
        },
      }),
    )
  })

  it('transformFrontendEventsToBackend transforms events faithfully', () => {
    const frontendEvents = [
      {
        seq: 0,
        glyphIndex: 0,
        segmentIndex: 0,
        type: 'pointerdown' as const,
        point: { x: 0.1, y: 0.2 },
        timestampMs: 100,
        pointerId: 1,
        isOutOfBounds: false,
        state: 'drawing' as const,
        score: { coverage: 0, precision: 1, engagement: 0, overall: 0 },
      },
      {
        seq: 1,
        glyphIndex: 0,
        segmentIndex: 0,
        type: 'pointercancel' as const,
        point: { x: 0.5, y: 0.5 },
        timestampMs: 200,
        pointerId: 1,
        isOutOfBounds: true,
        state: 'invalid' as const,
        score: { coverage: 0, precision: 1, engagement: 0, overall: 0 },
      },
    ]

    const backendEvents = transformFrontendEventsToBackend(frontendEvents)
    expect(backendEvents).toEqual([
      {
        seq: 0,
        type: 'down',
        pointer_id: 1,
        x_norm: 0.1,
        y_norm: 0.2,
        t_ms: 100,
        in_bounds: true,
        glyph_index: 0,
        segment_index: 0,
      },
      {
        seq: 1,
        type: 'cancel',
        pointer_id: 1,
        x_norm: null,
        y_norm: null,
        t_ms: 200,
        in_bounds: false,
        glyph_index: 0,
        segment_index: 0,
      },
    ])
  })

  it('clearTransientEvidence removes transient entries', () => {
    saveTransientEvidence('test_k', 'v')
    expect(getTransientEvidence('test_k')).toBe('v')
    clearTransientEvidence()
    expect(getTransientEvidence('test_k')).toBeNull()
  })

  it('transformFrontendEvidencesToBackend packages full session evidence faithfully', () => {
    const evidence = transformFrontendEvidencesToBackend(
      [],
      [],
      ['A', 'B'],
      {
        glyphSetId: 1,
        glyphSetVersion: 'uppercase-block-v1',
        glyphSetSha256: 'sha256:abcd',
        pauseGraceMs: 1500,
      },
      'completed',
    )

    expect(evidence.schema_version).toBe(1)
    expect(evidence.scoring_version).toBe(1)
    expect(evidence.glyph_set_id).toBe(1)
    expect(evidence.glyphs).toHaveLength(2)
    expect(evidence.status).toBe('completed')
  })
})
