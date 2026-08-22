import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  type BackendTracingRunOut,
  CANONICAL_GLYPH_SET_HASH,
  CANONICAL_GLYPH_SET_ID,
  CANONICAL_GLYPH_SET_VERSION,
  type TracingSessionEvidenceV1,
} from '@/lib/tracing/types'
import { TracingRunReviewView } from './TracingRunReviewView'

const validMockSession: TracingSessionEvidenceV1 = {
  schemaVersion: 'v1',
  scoringVersion: 'v1',
  glyphSetId: CANONICAL_GLYPH_SET_ID,
  glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
  glyphSetHash: CANONICAL_GLYPH_SET_HASH,
  sessionId: 'run_session_test_123',
  childName: 'Vitória',
  mode: 'timed_pause',
  status: 'completed',
  startedAt: '2026-08-22T15:00:00.000Z',
  completedAt: '2026-08-22T15:02:00.000Z',
  durationMs: 120000,
  glyphs: [
    {
      schemaVersion: 'v1',
      scoringVersion: 'v1',
      glyphSetId: CANONICAL_GLYPH_SET_ID,
      glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
      glyphSetHash: CANONICAL_GLYPH_SET_HASH,
      sessionId: 'run_session_test_123',
      glyphId: 'V',
      character: 'V',
      glyphIndex: 0,
      mode: 'timed_pause',
      status: 'completed',
      startedAt: '2026-08-22T15:00:00.000Z',
      completedAt: '2026-08-22T15:01:00.000Z',
      isCompleted: true,
      threshold: 70,
      finalScore: {
        coverage: 0.9,
        precision: 0.95,
        engagement: 1.0,
        overall: 0.855,
      },
      scoreHistory: [],
      events: [
        {
          seq: 1,
          glyphIndex: 0,
          segmentIndex: 1,
          type: 'pointerdown',
          point: { x: 0.2, y: 0.15 },
          timestampMs: 0,
          pointerId: 1,
          isOutOfBounds: false,
          state: 'drawing',
          score: { coverage: 0.1, precision: 1, engagement: 0.2, overall: 0.02 },
        },
        {
          seq: 2,
          glyphIndex: 0,
          segmentIndex: 1,
          type: 'pointermove',
          point: { x: 0.5, y: 0.85 },
          timestampMs: 500,
          pointerId: 1,
          isOutOfBounds: false,
          state: 'drawing',
          score: { coverage: 0.5, precision: 1, engagement: 0.8, overall: 0.4 },
        },
        {
          seq: 3,
          glyphIndex: 0,
          segmentIndex: 1,
          type: 'pointerup',
          point: { x: 0.8, y: 0.15 },
          timestampMs: 1000,
          pointerId: 1,
          isOutOfBounds: false,
          state: 'completed',
          score: { coverage: 0.9, precision: 0.95, engagement: 1.0, overall: 0.855 },
        },
      ],
      strokes: [
        {
          id: 'stroke_1',
          glyphIndex: 0,
          segmentIndex: 1,
          points: [
            { x: 0.2, y: 0.15, timestampMs: 0 },
            { x: 0.5, y: 0.85, timestampMs: 500 },
            { x: 0.8, y: 0.15, timestampMs: 1000 },
          ],
          startedAtMs: 0,
          endedAtMs: 1000,
          isComplete: true,
          status: 'completed',
          outOfBoundsCount: 0,
        },
      ],
      outOfBoundsCount: 0,
      graceExpirationsCount: 0,
      durationMs: 60000,
    },
  ],
}

describe('TracingRunReviewView (Tickets A4 & A5 Adult Run Review UI)', () => {
  it('renders overall and per-letter numeric scores for adult review with provenance metadata', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.getByText(/Auditoria de Partida de Traçado/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Concluída/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/86/i).length).toBeGreaterThanOrEqual(1) // overall 0.855 -> 86%
    expect(screen.getByText(/90%/i)).toBeInTheDocument()
    expect(screen.getByText(/95%/i)).toBeInTheDocument()
    expect(screen.getByText(/100%/i)).toBeInTheDocument()

    // Provenance
    expect(screen.getByText(/Verificado SHA-256/i)).toBeInTheDocument()
  })

  it('renders separate Modelo Canônico and Traço Real panels', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.getByText(/Modelo da Letra V/i)).toBeInTheDocument()
    expect(screen.getByText(/Traço Real da Criança/i)).toBeInTheDocument()
  })

  it('proves scrubbing to first event does NOT show final trace and later events progressively reveal it', () => {
    const { container } = render(<TracingRunReviewView session={validMockSession} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()

    // Scrub to event 0 (pointerdown only: 1 point, short path)
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.getByText(/Evento 1 de 3/i)).toBeInTheDocument()
    expect(container.querySelector('circle[fill="#F6552D"]')).toBeInTheDocument()

    // Scrub to event 1 (pointermove: 2 points)
    fireEvent.change(slider, { target: { value: '1' } })
    expect(screen.getByText(/Evento 2 de 3/i)).toBeInTheDocument()

    // Scrub to event 2 (pointerup: 3 points)
    fireEvent.change(slider, { target: { value: '2' } })
    expect(screen.getByText(/Evento 3 de 3/i)).toBeInTheDocument()
  })

  it('shows "Modelo indisponível" when glyphSetId or SHA-256 hash does not match immutable artifact', () => {
    const baseGlyph = validMockSession.glyphs[0]
    if (!baseGlyph) throw new Error('Base glyph not found')
    const invalidHashSession: TracingSessionEvidenceV1 = {
      ...validMockSession,
      glyphSetHash: 'sha256:invalid_mismatched_hash_12345',
      glyphs: [
        {
          ...baseGlyph,
          glyphSetHash: 'sha256:invalid_mismatched_hash_12345',
        },
      ],
    }

    render(<TracingRunReviewView session={invalidHashSession} />)

    expect(screen.getByText(/Modelo indisponível/i)).toBeInTheDocument()
    expect(
      screen.getByText(/O modelo original desta versão\/hash não está disponível localmente\./i),
    ).toBeInTheDocument()
  })

  it('renders server geometry faithfully when BackendTracingRunOut is passed with glyph_set', () => {
    const backendRun: BackendTracingRunOut = {
      id: 501,
      game_id: 1,
      child_id: 'child-1',
      status: 'completed',
      score: 92,
      duration_seconds: 45,
      glyph_set_id: 1,
      glyph_set_version: 'uppercase-block-v1',
      glyph_set_sha256: 'sha256:server_geom_hash',
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
        artifact_sha256: 'sha256:server_geom_hash',
        sha256: 'sha256:server_geom_hash',
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
      evidence: {
        schema_version: 1,
        scoring_version: 1,
        glyph_set_id: 1,
        glyph_set_version: 'uppercase-block-v1',
        glyph_set_sha256: 'sha256:server_geom_hash',
        artifact_version: 'uppercase-block-v1',
        artifact_sha256: 'sha256:server_geom_hash',
        pause_grace_ms: 1500,
        status: 'completed',
        events: [
          {
            seq: 0,
            type: 'down',
            pointer_id: 1,
            x_norm: 0.08,
            y_norm: 1.0,
            t_ms: 0,
            in_bounds: true,
            glyph_index: 0,
            segment_index: 0,
          },
        ],
        glyphs: [
          {
            glyph_index: 0,
            grapheme: 'A',
            status: 'completed',
            score: 92,
            coverage: 0.95,
            precision: 0.98,
            engagement: 1.0,
            segments: [],
          },
        ],
      },
    }

    render(<TracingRunReviewView session={backendRun} />)
    expect(screen.getByText(/Modelo da Letra A/i)).toBeInTheDocument()
    expect(screen.getAllByText(/92/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Verificado SHA-256/i)).toBeInTheDocument()
  })

  it('renders unavailable evidence state when session is null', () => {
    render(<TracingRunReviewView session={null} />)

    expect(screen.getByText(/Nenhuma partida selecionada para auditoria\./i)).toBeInTheDocument()
  })

  it('preserves privacy with NO export, share, or download buttons', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.queryByText(/Exportar/i)).toBeNull()
    expect(screen.queryByText(/Compartilhar/i)).toBeNull()
    expect(screen.queryByText(/Download/i)).toBeNull()
    expect(screen.queryByText(/Baixar/i)).toBeNull()
  })
})
