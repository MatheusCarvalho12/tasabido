import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HOLD_MS, PadlockButton } from './PadlockButton'

async function renderPadlock(onUnlocked = vi.fn()) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <PadlockButton onUnlocked={onUnlocked} />,
  })
  const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute]) })
  await router.load()
  render(<RouterProvider router={router} />)
  return { onUnlocked }
}

describe('PadlockButton', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dispara onUnlocked depois de segurar por 1s', async () => {
    const { onUnlocked } = await renderPadlock()
    const button = screen.getByRole('button', { name: 'Abrir a área dos pais' })

    // Render com timers reais; fake timers só para o hold (determinístico).
    vi.useFakeTimers()
    fireEvent.pointerDown(button)

    expect(onUnlocked).not.toHaveBeenCalled()
    vi.advanceTimersByTime(HOLD_MS)
    expect(onUnlocked).toHaveBeenCalledTimes(1)
  })

  it('volta ao idle sem navegar se soltar antes de completar', async () => {
    const { onUnlocked } = await renderPadlock()
    const button = screen.getByRole('button', { name: 'Abrir a área dos pais' })

    vi.useFakeTimers()
    fireEvent.pointerDown(button)
    vi.advanceTimersByTime(HOLD_MS - 100)
    fireEvent.pointerUp(button)
    vi.advanceTimersByTime(HOLD_MS * 2)

    expect(onUnlocked).not.toHaveBeenCalled()
  })
})
