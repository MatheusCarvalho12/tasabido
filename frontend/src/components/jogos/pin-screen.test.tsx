import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentPinStore } from '@/stores/useParentPinStore'
import { PIN_ERROR_OFFLINE, PIN_ERROR_WRONG, PinScreen } from './PinScreen'

async function renderPinScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: PinScreen,
  })
  const paisRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pais',
    component: () => <div>Área dos pais</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, paisRoute]),
    // Histórico isolado por teste: navegação de um teste não vaza pro próximo.
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function digitaPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
  for (const digit of pin) {
    await user.click(screen.getByRole('button', { name: `Dígito ${digit}` }))
  }
}

describe('PinScreen', () => {
  beforeEach(() => {
    useParentPinStore.getState().lock()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('mostra título, subtítulo e teclado', async () => {
    await renderPinScreen()
    expect(screen.getByRole('heading', { name: 'Digite o PIN dos pais' })).toBeInTheDocument()
    expect(screen.getByText('Para acessar as configurações da família')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Teclado do PIN' })).toBeInTheDocument()
  })

  it('valida na API ao completar 6 dígitos e navega para a área dos pais quando correto', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ valido: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    await renderPinScreen()

    await digitaPin(user, '123456')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [request] = fetchMock.mock.calls[0]
    expect(request.url).toBe('http://localhost:8000/api/family/pin/validate')
    expect(JSON.parse(await request.clone().text())).toEqual({ pin: '123456' })

    expect(await screen.findByText('Área dos pais')).toBeInTheDocument()
  })

  it('não valida com menos de 6 dígitos', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    await renderPinScreen()

    await digitaPin(user, '12345')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mostra "PIN incorreto" e limpa os dots quando a API responde 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ valido: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    await renderPinScreen()

    await digitaPin(user, '654321')

    expect(await screen.findByText(PIN_ERROR_WRONG)).toBeInTheDocument()
    // Dots voltaram a zero (aria-label do grupo de indicadores).
    expect(screen.getByRole('img', { name: '0 de 6 dígitos digitados' })).toBeInTheDocument()
    // É possível digitar de novo após o erro.
    await digitaPin(user, '000000')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('mostra mensagem honesta quando o servidor está fora do ar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const user = userEvent.setup()
    await renderPinScreen()

    await digitaPin(user, '123456')

    expect(await screen.findByText(PIN_ERROR_OFFLINE)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '0 de 6 dígitos digitados' })).toBeInTheDocument()
  })

  it('permite apagar dígitos com o backspace', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    await renderPinScreen()

    await user.click(screen.getByRole('button', { name: 'Dígito 1' }))
    await user.click(screen.getByRole('button', { name: 'Dígito 2' }))
    expect(screen.getByRole('img', { name: '2 de 6 dígitos digitados' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Apagar último dígito' }))
    expect(screen.getByRole('img', { name: '1 de 6 dígitos digitados' })).toBeInTheDocument()

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled())
  })
})
