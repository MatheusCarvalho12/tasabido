import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TracingSessionEvidenceV1 } from '@/lib/tracing/types'
import { TracingRunReviewView } from './TracingRunReviewView'

const mockSession: TracingSessionEvidenceV1 = {
  schemaVersion: 'v1',
  scoringVersion: 'v1',
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
  it('renders overall and per-letter numeric scores for adult review', () => {
    render(<TracingRunReviewView session={mockSession} />)

    expect(screen.getByText(/Avaliação de Traçado: Vitória/i)).toBeInTheDocument()
    expect(screen.getByText(/Partida Concluída/i)).toBeInTheDocument()
    expect(screen.getAllByText(/86%/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Coverage: 90%/i)).toBeInTheDocument()
    expect(screen.getByText(/Precision: 95%/i)).toBeInTheDocument()
    expect(screen.getByText(/Engagement: 100%/i)).toBeInTheDocument()
  })

  it('renders separate Modelo Canônico and Traço da Criança panels', () => {
    render(<TracingRunReviewView session={mockSession} />)

    expect(screen.getByText(/Painel 1: Modelo Canônico/i)).toBeInTheDocument()
    expect(screen.getByText(/Painel 2: Traço da Criança/i)).toBeInTheDocument()
    expect(screen.getByText(/1 traço\(s\) registrado\(s\)/i)).toBeInTheDocument()
  })

  it('renders faithful event replay controls without export/share/download buttons', () => {
    render(<TracingRunReviewView session={mockSession} />)

    expect(screen.getByText(/Replay Fiel de Eventos/i)).toBeInTheDocument()
    expect(screen.getByText(/Reproduzir/i)).toBeInTheDocument()

    // Assert that NO export/share/download buttons exist
    expect(screen.queryByText(/Exportar/i)).toBeNull()
    expect(screen.queryByText(/Compartilhar/i)).toBeNull()
    expect(screen.queryByText(/Download/i)).toBeNull()
    expect(screen.queryByText(/Baixar/i)).toBeNull()
  })

  it('renders unavailable evidence state when session is null or has empty glyphs', () => {
    render(<TracingRunReviewView session={null} />)

    expect(screen.getByText(/Evidência de traçado indisponível/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Não há dados de telemetria ou histórico de eventos/i),
    ).toBeInTheDocument()
  })
})
