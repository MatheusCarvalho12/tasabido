import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginForm } from './LoginForm'

async function renderLoginForm(onLoggedIn = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <LoginForm onLoggedIn={onLoggedIn} />,
  })
  const forgotRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/esqueci-senha',
    component: () => <div>Esqueci minha senha</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, forgotRoute]),
  })
  await router.load()

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return { onLoggedIn }
}

describe('LoginForm', () => {
  it('mostra erro de validação para e-mail inválido e senha curta', async () => {
    const user = userEvent.setup()
    await renderLoginForm()

    await user.type(screen.getByLabelText('E-mail'), 'email-invalido')
    await user.tab()

    expect(await screen.findByText('Digite um e-mail válido.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Senha'), '123')
    await user.tab()

    expect(
      await screen.findByText('A senha precisa de pelo menos 8 caracteres.'),
    ).toBeInTheDocument()
  })

  it('mostra "E-mail ou senha incorretos." quando a API responde 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'E-mail ou senha incorretos' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    await renderLoginForm()

    await user.type(screen.getByLabelText('E-mail'), 'pais@tasabido.com.br')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })

  it('mostra mensagem honesta quando o servidor está fora do ar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const user = userEvent.setup()
    await renderLoginForm()

    await user.type(screen.getByLabelText('E-mail'), 'pais@tasabido.com.br')
    await user.type(screen.getByLabelText('Senha'), 'senha12345')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(
      await screen.findByText(
        'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo em instantes.',
      ),
    ).toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
