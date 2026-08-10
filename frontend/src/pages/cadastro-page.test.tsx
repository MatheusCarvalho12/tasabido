import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { CadastroPage } from '@/pages/CadastroPage'
import { useCadastroStore } from '@/stores/useCadastroStore'

async function renderCadastroPage() {
  const rootRoute = createRootRoute()
  const cadastroRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro',
    component: CadastroPage,
  })
  const sobreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/sobre',
    component: () => <div>Sobre você</div>,
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Entrar</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([cadastroRoute, sobreRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/cadastro'] }),
  })
  await router.load()

  render(<RouterProvider router={router} />)
  return router
}

describe('CadastroPage (passo 1 — Quem é você?)', () => {
  beforeEach(() => {
    useCadastroStore.setState({ papel: null })
  })

  it('exibe os seis papéis com os rótulos humanizados', async () => {
    await renderCadastroPage()

    expect(screen.getByText('Criar conta da família')).toBeInTheDocument()
    for (const label of ['Mamãe', 'Papai', 'Vovó', 'Vovô', 'Responsável', 'Outro familiar']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('mantém Continuar desabilitado sem seleção e habilita ao escolher um papel', async () => {
    const user = userEvent.setup()
    await renderCadastroPage()

    const continuar = screen.getByRole('button', { name: /continuar/i })
    expect(continuar).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Papai' }))
    expect(screen.getByRole('button', { name: 'Papai' })).toHaveAttribute('aria-pressed', 'true')
    expect(continuar).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Mamãe' }))
    expect(useCadastroStore.getState().papel).toBe('mamae')
  })

  it('salva o papel na store e navega para /cadastro/sobre ao continuar', async () => {
    const user = userEvent.setup()
    const router = await renderCadastroPage()

    await user.click(screen.getByRole('button', { name: 'Vovó' }))
    expect(useCadastroStore.getState().papel).toBe('vovo')

    await user.click(screen.getByRole('button', { name: /continuar/i }))
    expect(router.state.location.pathname).toBe('/cadastro/sobre')
    expect(screen.getByText('Sobre você')).toBeInTheDocument()
  })

  it('navega para /login pelo link "Já tenho conta"', async () => {
    const user = userEvent.setup()
    const router = await renderCadastroPage()

    await user.click(screen.getByRole('link', { name: 'Já tenho conta' }))
    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByText('Entrar')).toBeInTheDocument()
  })
})
