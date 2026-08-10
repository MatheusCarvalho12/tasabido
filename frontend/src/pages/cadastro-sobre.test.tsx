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
      cpf: '',
      telefone: '',
      email: '',
      idade: '',
      senha: '',
      crianca: { nome: '', cpf: '', dataNascimento: '', idade: '', peso: '', condicoes: [] },
      redeApoio: [],
    })
  })

  it('exibe título, subtítulo e os sete campos do formulário', async () => {
    await renderSobrePage()

    expect(screen.getByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
    expect(screen.getByText('Conta pra gente quem é você')).toBeInTheDocument()
    for (const placeholder of [
      'Nome completo',
      'CPF',
      'Telefone',
      'E-mail',
      'Idade',
      'Senha',
      'Confirmar senha',
    ]) {
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    }
  })

  it('mantém Continuar desabilitado até o passo estar válido', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    const continuar = screen.getByRole('button', { name: /continuar/i })
    expect(continuar).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByPlaceholderText('CPF'), '295.379.955-93')
    await user.type(screen.getByPlaceholderText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByPlaceholderText('Idade'), '34')
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha123')

    expect(continuar).toBeEnabled()
  })

  it('mostra os erros humanizados ao sair dos campos inválidos', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'A')
    await user.click(screen.getByPlaceholderText('CPF'))
    expect(
      screen.getByText('Precisamos do seu nome pra te chamar do jeito certo'),
    ).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('CPF'), '123.456.789-00')
    await user.click(screen.getByPlaceholderText('Telefone'))
    expect(screen.getByText('Esse CPF não parece válido. Confere os números?')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Telefone'), '(00) 98765-4321')
    await user.click(screen.getByPlaceholderText('E-mail'))
    expect(
      screen.getByText('Esse telefone não parece certo. Confere o DDD e o número?'),
    ).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@')
    await user.click(screen.getByPlaceholderText('Senha'))
    expect(screen.getByText('Esse e-mail não parece certo. Dá uma conferida?')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Senha'), 'abc')
    await user.click(screen.getByPlaceholderText('Nome completo'))
    expect(
      screen.getByText('A senha precisa ter pelo menos 8 caracteres, com letra e número'),
    ).toBeInTheDocument()
  })

  it('valida a confirmação da senha quando as senhas não batem', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha456')
    await user.click(screen.getByPlaceholderText('Nome completo'))

    expect(screen.getByText('As senhas não batem. Confere de novo?')).toBeInTheDocument()
  })

  it('salva os dados na store e navega para /cadastro/familia quando válido', async () => {
    const user = userEvent.setup()
    const router = await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByPlaceholderText('CPF'), '295.379.955-93')
    await user.type(screen.getByPlaceholderText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByPlaceholderText('Idade'), '34')
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    const state = useCadastroStore.getState()
    expect(state.nome).toBe('Ana Souza')
    expect(state.cpf).toBe('295.379.955-93')
    expect(state.telefone).toBe('(11) 98765-4321')
    expect(state.email).toBe('ana@exemplo.com')
    expect(state.idade).toBe('34')
    expect(state.senha).toBe('senha123')
    expect(router.state.location.pathname).toBe('/cadastro/familia')
    expect(screen.getByText('Sua família')).toBeInTheDocument()
  })
})
