import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ParentsAreaPage } from '@/pages/ParentsAreaPage'
import { useParentPinStore } from '@/stores/useParentPinStore'

/** Mesmo guard da rota /pais do router.tsx — testado isoladamente. */
function requireParentUnlock() {
  if (!useParentPinStore.getState().unlocked) {
    throw redirect({ to: '/' })
  }
}

function renderPaisRoute() {
  const rootRoute = createRootRoute()
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Modo criança</div>,
  })
  const paisRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pais',
    beforeLoad: requireParentUnlock,
    component: ParentsAreaPage,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, paisRoute]),
    // Histórico isolado por teste: navegação de um teste não vaza pro próximo.
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  return router
}

describe('guarda da rota /pais', () => {
  beforeEach(() => {
    useParentPinStore.getState().lock()
  })

  afterEach(() => {
    useParentPinStore.getState().lock()
  })

  it('sem PIN validado, redireciona para o modo criança', async () => {
    const router = renderPaisRoute()
    await router.navigate({ to: '/pais' })
    expect(await screen.findByText('Modo criança')).toBeInTheDocument()
    expect(screen.queryByText('Área dos pais')).not.toBeInTheDocument()
  })

  it('com PIN validado, mostra a área dos pais', async () => {
    useParentPinStore.getState().unlock()
    const router = renderPaisRoute()
    await router.navigate({ to: '/pais' })
    expect(await screen.findByRole('heading', { name: 'Área dos pais' })).toBeInTheDocument()
  })
})
