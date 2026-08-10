import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { CadastroFinalizarPage } from '@/pages/CadastroFinalizarPage'
import { useCadastroStore } from '@/stores/useCadastroStore'

function renderComQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

async function renderFinalizarPage() {
  const rootRoute = createRootRoute()
  const finalizarRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/finalizar',
    component: CadastroFinalizarPage,
  })
  const privacidadeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/privacidade',
    component: () => <div>Política de Privacidade</div>,
  })
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([finalizarRoute, privacidadeRoute, homeRoute]),
    history: createMemoryHistory({ initialEntries: ['/cadastro/finalizar'] }),
  })
  await router.load()

  renderComQuery(<RouterProvider router={router} />)
  return router
}

/** Estado válido em todos os passos anteriores: só falta o consentimento LGPD. */
function seedStoreValida() {
  useCadastroStore.setState({
    papel: 'mamae',
    nome: 'Ana Souza',
    cpf: '295.379.955-93',
    telefone: '(11) 98765-4321',
    email: 'ana@exemplo.com',
    dataNascimento: '15/08/1990',
    cep: '01310-100',
    senha: 'senha123',
    lgpdConsent: false,
    crianca: {
      nome: 'Bia Souza',
      cpf: '982.713.580-57',
      dataNascimento: '10/05/2020',
      peso: '12',
      condicoes: [],
    },
    redeApoio: [],
  })
}

describe('CadastroFinalizarPage (passo 4 — Finalizar)', () => {
  beforeEach(() => {
    seedStoreValida()
  })

  it('mantém Criar conta desabilitado até marcar o consentimento LGPD', async () => {
    const user = userEvent.setup()
    await renderFinalizarPage()

    const criarConta = screen.getByRole('button', { name: /criar conta/i })
    expect(criarConta).toBeDisabled()

    // Clicar no texto do consentimento ativa o checkbox (label htmlFor).
    await user.click(screen.getByText(/concordo com o uso dos meus dados/i))

    expect(criarConta).toBeEnabled()
    expect(useCadastroStore.getState().lgpdConsent).toBe(true)
  })

  it('mostra o link da Política de Privacidade e navega para /privacidade', async () => {
    const user = userEvent.setup()
    const router = await renderFinalizarPage()

    const link = screen.getByRole('link', { name: 'Política de Privacidade' })
    expect(link).toBeInTheDocument()

    await user.click(link)

    expect(router.state.location.pathname).toBe('/privacidade')
    expect(screen.getByText('Política de Privacidade')).toBeInTheDocument()
  })
})
