import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TracingEngine } from '@/lib/tracing/engine'
import { getGlyphGeometry } from '@/lib/tracing/geometry'
import { TracingCanvas } from './TracingCanvas'

describe('TracingCanvas (Ticket A2 Black on White v1)', () => {
  const glyphA = getGlyphGeometry('A')
  let engine: TracingEngine

  beforeEach(() => {
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn()
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn()
    }

    engine = new TracingEngine({
      glyph: glyphA,
      mode: 'strict_continuous',
    })
  })

  it('renders SVG target and accessibility label', () => {
    render(
      <TracingCanvas
        engine={engine}
        glyph={glyphA}
        state="ready"
        score={{ coverage: 0, precision: 1, engagement: 0, overall: 0 }}
      />,
    )

    expect(screen.getByLabelText(/Guia de traçado da Letra A/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Passe o dedo na letra para desenhar/i)
  })

  it('renders black on white target container', () => {
    render(
      <TracingCanvas
        engine={engine}
        glyph={glyphA}
        state="ready"
        score={{ coverage: 0, precision: 1, engagement: 0, overall: 0 }}
      />,
    )

    const container = screen.getByTestId('tracing-canvas-container')
    expect(container).toHaveClass('bg-white')
  })

  it('handles pointer interaction and draws faithfully', () => {
    const onUpdate = vi.fn()
    render(
      <TracingCanvas
        engine={engine}
        glyph={glyphA}
        state="drawing"
        score={{ coverage: 0.5, precision: 0.9, engagement: 0.8, overall: 0.6 }}
        onStateUpdate={onUpdate}
      />,
    )

    const container = screen.getByTestId('tracing-canvas-container')

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    fireEvent.pointerDown(container, {
      clientX: 100,
      clientY: 30,
      pointerId: 1,
    })

    fireEvent.pointerMove(container, {
      clientX: 60,
      clientY: 140,
      pointerId: 1,
    })

    fireEvent.pointerUp(container, {
      clientX: 60,
      clientY: 140,
      pointerId: 1,
    })

    expect(onUpdate).toHaveBeenCalled()
  })

  it('handles pointercancel and lostpointercapture cleanly', () => {
    const onUpdate = vi.fn()
    render(
      <TracingCanvas
        engine={engine}
        glyph={glyphA}
        state="drawing"
        score={{ coverage: 0.2, precision: 1, engagement: 0.5, overall: 0.3 }}
        onStateUpdate={onUpdate}
      />,
    )

    const container = screen.getByTestId('tracing-canvas-container')

    fireEvent.pointerDown(container, {
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    })

    fireEvent.pointerCancel(container, {
      pointerId: 1,
    })

    expect(engine.getActivePointerId()).toBeNull()
  })
})
