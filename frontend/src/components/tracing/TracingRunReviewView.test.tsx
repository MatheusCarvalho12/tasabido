import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
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
      threshold: 0.7,
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

describe('TracingRunReviewView (Ticket A4 Adult Run Review UI)', () => {
  it('renders overall and per-letter numeric scores for adult review with provenance metadata', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.getByText(/Avaliação de Traçado: Vitória/i)).toBeInTheDocument()
    expect(screen.getByText(/Partida Concluída/i)).toBeInTheDocument()
    expect(screen.getAllByText(/86%/i).length).toBeGreaterThanOrEqual(1) // overall 0.855 -> 86%
    expect(screen.getByText(/Coverage: 90%/i)).toBeInTheDocument()
    expect(screen.getByText(/Precision: 95%/i)).toBeInTheDocument()
    expect(screen.getByText(/Engagement: 100%/i)).toBeInTheDocument()

    // Provenance
    expect(screen.getByText(/Proveniência:/i)).toBeInTheDocument()
    expect(screen.getByText(/Maiúsculas bloco \(v1.0.0\)/i)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(CANONICAL_GLYPH_SET_HASH, 'i'))).toBeInTheDocument()
  })

  it('renders separate Modelo Canônico and Traço da Criança panels', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.getByText(/Painel 1: Modelo Canônico/i)).toBeInTheDocument()
    expect(screen.getByText(/Painel 2: Traço da Criança/i)).toBeInTheDocument()
  })

  it('proves scrubbing to first event (seq 1) does NOT show final trace and later events progressively reveal it', () => {
    const { container } = render(<TracingRunReviewView session={validMockSession} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()

    // Scrub to event 0 (pointerdown only: 1 point, no polyline yet)
    fireEvent.change(slider, { target: { value: '0' } })
    expect(screen.getByText(/Traçado parcial revelado até o evento #1/i)).toBeInTheDocument()
    expect(container.querySelector('polyline')).toBeNull()
    expect(container.querySelector('circle[fill="#000000"]')).toBeInTheDocument()

    // Scrub to event 1 (pointermove: 2 points -> polyline rendered)
    fireEvent.change(slider, { target: { value: '1' } })
    expect(screen.getByText(/Traçado parcial revelado até o evento #2/i)).toBeInTheDocument()
    const polyline = container.querySelector('polyline')
    expect(polyline).not.toBeNull()
    expect(polyline?.getAttribute('points')).toBe('20,15 50,85')

    // Scrub to event 2 (pointerup: 3 points -> full polyline)
    fireEvent.change(slider, { target: { value: '2' } })
    expect(screen.getByText(/Traçado parcial revelado até o evento #3/i)).toBeInTheDocument()
    const fullPolyline = container.querySelector('polyline')
    expect(fullPolyline?.getAttribute('points')).toBe('20,15 50,85 80,15')
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
      screen.getByText(/Conjunto de glifos não encontrado ou hash SHA-256 incompatível/i),
    ).toBeInTheDocument()
  })

  it('renders unavailable evidence state when session is null or has empty glyphs', () => {
    render(<TracingRunReviewView session={null} />)

    expect(screen.getByText(/Evidência de traçado indisponível/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Não há dados de telemetria ou histórico de eventos/i),
    ).toBeInTheDocument()
  })

  it('preserves privacy with NO export, share, or download buttons', () => {
    render(<TracingRunReviewView session={validMockSession} />)

    expect(screen.queryByText(/Exportar/i)).toBeNull()
    expect(screen.queryByText(/Compartilhar/i)).toBeNull()
    expect(screen.queryByText(/Download/i)).toBeNull()
    expect(screen.queryByText(/Baixar/i)).toBeNull()
  })
})
