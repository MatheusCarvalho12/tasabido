import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

/**
 * Escolhe uma data no DatePicker Tá Sabido usando as abas
 * Ano → Mês → Dia e confirma com "Aplicar".
 */
async function escolherDataNascimento(
  user: ReturnType<typeof userEvent.setup>,
  dia: string,
  mes: string,
  ano: string,
) {
  await user.click(screen.getByRole('button', { name: /data de nascimento/i }))
  await user.click(await screen.findByRole('tab', { name: 'Ano' }))
  // A página 0 mostra os 12 anos mais recentes; volta com as setas até achar o ano.
  for (let tentativas = 0; tentativas < 12; tentativas += 1) {
    if (screen.queryByRole('button', { name: ano })) {
      break
    }
    await user.click(screen.getByRole('button', { name: 'Página de anos anterior' }))
  }
  await user.click(screen.getByRole('button', { name: ano }))
  await user.click(screen.getByRole('tab', { name: 'Mês' }))
  await user.click(screen.getByRole('button', { name: mes }))
  const painelDia = screen.getByRole('tabpanel', { name: 'Dia' })
  await user.click(within(painelDia).getByText(dia))
  await user.click(screen.getByRole('button', { name: 'Aplicar' }))
}

describe('CadastroSobrePage (passo 2 — Sobre você)', () => {
  beforeEach(() => {
    // Sem rede nos testes: a busca do ViaCEP falha em silêncio por padrão.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    useCadastroStore.setState({
      papel: null,
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      dataNascimento: '',
      cep: '',
      senha: '',
      lgpdConsent: false,
      crianca: { nome: '', cpf: '', dataNascimento: '', peso: '', condicoes: [] },
      redeApoio: [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exibe título, subtítulo e os oito campos do formulário', async () => {
    await renderSobrePage()

    expect(screen.getByRole('heading', { name: 'Sobre você' })).toBeInTheDocument()
    expect(screen.getByText('Conta pra gente quem é você')).toBeInTheDocument()
    for (const placeholder of [
      'Nome completo',
      'CPF',
      'CEP',
      'Telefone',
      'E-mail',
      'Senha',
      'Confirmar senha',
    ]) {
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /data de nascimento/i })).toBeInTheDocument()
  })

  it('mantém Continuar desabilitado até o passo estar válido', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    const continuar = screen.getByRole('button', { name: /continuar/i })
    expect(continuar).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByPlaceholderText('CPF'), '295.379.955-93')
    await escolherDataNascimento(user, '15', 'Agosto', '1990')
    await user.type(screen.getByPlaceholderText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha123')

    expect(continuar).toBeEnabled()
  })

  it('não permite escolher anos no futuro no DatePicker', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.click(screen.getByRole('button', { name: /data de nascimento/i }))
    await user.click(await screen.findByRole('tab', { name: 'Ano' }))

    // A última página de anos termina no ano atual (nada futuro).
    expect(
      screen.getByRole('button', { name: String(new Date().getFullYear()) }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: String(new Date().getFullYear() + 1) }),
    ).not.toBeInTheDocument()
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

  it('rejeita CEP incompleto com a mensagem humanizada', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('CEP'), '01310')
    await user.click(screen.getByPlaceholderText('Telefone'))

    expect(screen.getByText('Esse CEP não parece certo. Confere os números?')).toBeInTheDocument()
  })

  it('consulta o ViaCEP ao sair do CEP válido e mostra "Cidade, UF"', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ cep: '01310-100', localidade: 'São Paulo', uf: 'SP' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('CEP'), '01310-100')
    await user.click(screen.getByPlaceholderText('Telefone'))

    expect(await screen.findByText('São Paulo, SP')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json')
  })

  it('segue em silêncio quando o ViaCEP falha (sem erro bloqueante)', async () => {
    const user = userEvent.setup()
    await renderSobrePage()

    await user.type(screen.getByPlaceholderText('CEP'), '01310-100')
    await user.click(screen.getByPlaceholderText('Telefone'))

    // Busca falhou (stub offline): nenhum erro nem cidade aparecem.
    expect(
      screen.queryByText('Esse CEP não parece certo. Confere os números?'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/São Paulo, SP/)).not.toBeInTheDocument()
  })

  it('salva os dados na store e navega para /cadastro/familia quando válido', async () => {
    const user = userEvent.setup()
    const router = await renderSobrePage()

    await user.type(screen.getByPlaceholderText('Nome completo'), 'Ana Souza')
    await user.type(screen.getByPlaceholderText('CPF'), '295.379.955-93')
    await escolherDataNascimento(user, '15', 'Agosto', '1990')
    await user.type(screen.getByPlaceholderText('CEP'), '01310-100')
    await user.type(screen.getByPlaceholderText('Telefone'), '(11) 98765-4321')
    await user.type(screen.getByPlaceholderText('E-mail'), 'ana@exemplo.com')
    await user.type(screen.getByPlaceholderText('Senha'), 'senha123')
    await user.type(screen.getByPlaceholderText('Confirmar senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: /continuar/i }))

    const state = useCadastroStore.getState()
    expect(state.nome).toBe('Ana Souza')
    expect(state.cpf).toBe('295.379.955-93')
    expect(state.telefone).toBe('(11) 98765-4321')
    expect(state.email).toBe('ana@exemplo.com')
    expect(state.dataNascimento).toBe('15/08/1990')
    expect(state.cep).toBe('01310-100')
    expect(state.senha).toBe('senha123')
    expect(router.state.location.pathname).toBe('/cadastro/familia')
    expect(screen.getByText('Sua família')).toBeInTheDocument()
  })
})
