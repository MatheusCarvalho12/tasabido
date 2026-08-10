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

import { CadastroSobrePage } from '@/pages/CadastroSobrePage'
import { useCadastroStore } from '@/stores/useCadastroStore'

async function renderSobrePage() {
  const rootRoute = createRootRoute()
  const sobreRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/sobre',
    component: CadastroSobrePage,
  })
  const familiaRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/familia',
    component: () => <div>Sua família</div>,
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => <div>Entrar</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([sobreRoute, familiaRoute, loginRoute]),
    history: createMemoryHistory({ initialEntries: ['/cadastro/sobre'] }),
  })
  await router.load()

  render(<RouterProvider router={router} />)
  return router
}

describe('CadastroSobrePage (passo 2 — Sobre você)', () => {
  beforeEach(() => {
    useCadastroStore.setState({
      papel: null,
      nome: '',
      telefone: '',
      email: '',
      idade: '',
      senha: '',
      crianca: { nome: '', dataNascimento: '', idade: '', peso: '', condicoes: [] },
      redeApoio: [],
    })
  })

  it('exibe título, subtítulo e os seis campos do formulário', async () => {
    await renderSobrePage()

    expect(screen.getByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
    expect(screen.getByText('Conta pra gente quem é você')).toBeInTheDocument()
    for (const placeholder of [
      'Nome completo',
      'Telefone',
      'E-mail',
      'Idade',
      'Senha',
      'Confirmar senha',
    ]) {
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    }
  })

  it('mostra os erros de validação ao enviar o formulário vazio', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('Digite o nome completo.')).toBeInTheDocument()
    expect(screen.getByText('Digite um telefone com DDD.')).toBeInTheDocument()
    expect(screen.getByText('Digite um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('A senha precisa de pelo menos 8 caracteres.')).toBeInTheDocument()
  })

  it('valida a confirmação da senha quando as senhas não batem', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha456')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument()
  })

  it('salva os dados na store e navega para /cadastro/familia quando válido', async () => {
    const user = userEvent.setup()
    const router = await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByPlaceholderText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByPlaceholderText('Idade'), '34')
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    const state = useCadastroStore.getState()
    expect(state.nome).toBe('Ana Souza')
    expect(state.telefone).toBe('(11) 98765-4321')
    expect(state.email).toBe('ana@exemplo.com')
    expect(state.idade).toBe('34')
    expect(state.senha).toBe('senha123')
    expect(router.state.location.pathname).toBe('/cadastro/familia')
    expect(screen.getByText('Sua família')).toBeInTheDocument()
  })
})
