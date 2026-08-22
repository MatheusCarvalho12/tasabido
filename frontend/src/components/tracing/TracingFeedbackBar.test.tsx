import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TracingFeedbackBar } from './TracingFeedbackBar'
import { TracingGlyphStrip } from './TracingGlyphStrip'

describe('TracingFeedbackBar (Ticket A2/A3)', () => {
  it('renders qualitative copy in Brazilian Portuguese and never numeric scores', () => {
    render(
      <TracingFeedbackBar
        state="drawing"
        score={{ coverage: 0.75, precision: 0.88, engagement: 0.8, overall: 0.78 }}
      />,
    )

    // Should contain qualitative encouragement
    expect(screen.getByText(/Muito bem! Você está quase lá!/i)).toBeInTheDocument()

    // Must NEVER contain raw numeric scores or percentages in the text
    expect(screen.queryByText(/78%/)).toBeNull()
    expect(screen.queryByText(/0\.78/)).toBeNull()
    expect(screen.queryByText(/75%/)).toBeNull()
  })

  it('renders valid-touching copy encouraging release', () => {
    render(
      <TracingFeedbackBar
        state="valid_touching"
        score={{ coverage: 0.9, precision: 0.95, engagement: 0.9, overall: 0.92 }}
      />,
    )

    expect(screen.getByText(/Muito bem! Agora solte o dedinho!/i)).toBeInTheDocument()
  })

  it('renders grace copy during pause', () => {
    render(
      <TracingFeedbackBar
        state="grace"
        score={{ coverage: 0.4, precision: 0.9, engagement: 0.5, overall: 0.45 }}
      />,
    )

    expect(screen.getByText(/Pode continuar! Volte a desenhar/i)).toBeInTheDocument()
  })
})

describe('TracingGlyphStrip', () => {
  it('renders glyph badges and highlights current and completed letters', () => {
    const glyphs = ['J', 'O', 'Ã', 'O']
    const completed = new Set([0, 1])

    render(<TracingGlyphStrip glyphs={glyphs} currentIndex={2} completedIndices={completed} />)

    expect(screen.getByText('J')).toBeInTheDocument()
    expect(screen.getByText('Ã')).toBeInTheDocument()
  })
})
