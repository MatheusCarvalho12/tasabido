import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CadastroProfissionalAtuacaoPage } from '@/pages/CadastroProfissionalAtuacaoPage'
import { useCadastroProfissionalStore } from '@/stores/useCadastroProfissionalStore'

async function renderAtuacaoPage() {
  const rootRoute = createRootRoute()
  const atuacaoRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/profissional/atuacao',
    component: CadastroProfissionalAtuacaoPage,
  })
  const finalizarRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/cadastro/profissional/finalizar',
    component: () => <div>Finalizar</div>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([atuacaoRoute, finalizarRoute]),
    history: createMemoryHistory({ initialEntries: ['/cadastro/profissional/atuacao'] }),
  })
  await router.load()

  render(<RouterProvider router={router} />)
  return router
}

/** Escolhe um conselho no PillSelect (Base UI): abre o popup e clica na opção. */
async function escolherConselho(user: ReturnType<typeof userEvent.setup>, conselho: string) {
  await user.click(screen.getByRole('combobox', { name: 'Conselho profissional' }))
  await user.click(await screen.findByRole('option', { name: conselho }))
}

/** Escolhe uma UF/região no dropdown do registro (rótulo dinâmico por conselho). */
async function escolherRegiao(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  opcao: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: opcao }))
}

describe('CadastroProfissionalAtuacaoPage (passo 3 — número do registro dinâmico)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useCadastroProfissionalStore.setState({
      conselho: null,
      numeroRegistro: '',
      uf: null,
      cnpj: '',
      especialidades: [],
      faixas: [],
      atendimento: [],
      lgpdConsent: false,
    })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('muda o placeholder do número do registro conforme o conselho escolhido', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    // Sem conselho: padrão.
    expect(screen.getByPlaceholderText('ex.: 123456')).toBeInTheDocument()

    await escolherConselho(user, 'CRM')
    expect(screen.getByPlaceholderText('ex.: 123456')).toBeInTheDocument()

    await escolherConselho(user, 'CRP')
    expect(screen.getByPlaceholderText('ex.: 12345')).toBeInTheDocument()

    await escolherConselho(user, 'CREFITO')
    expect(screen.getByPlaceholderText('ex.: 123456-F')).toBeInTheDocument()

    await escolherConselho(user, 'CRFa')
    expect(screen.getByPlaceholderText('ex.: 2-12345')).toBeInTheDocument()

    await escolherConselho(user, 'CRO')
    expect(screen.getByPlaceholderText('ex.: 12345')).toBeInTheDocument()

    await escolherConselho(user, 'Outro')
    expect(screen.getByPlaceholderText('ex.: 123456')).toBeInTheDocument()
  })

  it('limpa o número do registro com aviso quando ele não cabe na regra do novo conselho', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'Outro')
    await user.type(screen.getByPlaceholderText('ex.: 123456'), '12345678')

    // 8 dígitos cabem em Outro (4–10), não cabem em CRM (4–7): limpa + avisa.
    await escolherConselho(user, 'CRM')
    expect(screen.getByPlaceholderText('ex.: 123456')).toBeInTheDocument()
    expect(
      screen.getByText('Confere o número do registro? O formato mudou com o conselho.'),
    ).toBeInTheDocument()
  })

  it('mantém o número quando ele ainda cabe na regra do novo conselho', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'CRM')
    await user.type(screen.getByPlaceholderText('ex.: 123456'), '12345')

    // 5 dígitos cabem em CRP (4–6): nada é limpo e nenhum aviso aparece.
    await escolherConselho(user, 'CRP')
    const campo = screen.getByPlaceholderText('ex.: 12345')
    expect(campo).toHaveValue('12345')
    expect(
      screen.queryByText('Confere o número do registro? O formato mudou com o conselho.'),
    ).not.toBeInTheDocument()
  })

  it('aceita o sufixo -F do CREFITO na digitação (máscara insere o hífen)', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'CREFITO')
    const campo = screen.getByPlaceholderText('ex.: 123456-F')
    await user.type(campo, '12345')
    await user.type(campo, 'F')
    expect(campo).toHaveValue('12345-F')
  })

  it('avisa quando o CREFITO tem sufixo errado ao sair do campo', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'CREFITO')
    const campo = screen.getByPlaceholderText('ex.: 123456-F')
    await user.type(campo, '123456')
    await user.type(campo, 'F')
    await user.type(campo, 'O')
    expect(campo).toHaveValue('123456-FO')
    await user.click(screen.getByRole('combobox', { name: 'Conselho profissional' }))
    expect(
      screen.getByText(
        'Confere o número do CREFITO? Aceita 4 a 6 dígitos, com -F ou -TO opcional.',
      ),
    ).toBeInTheDocument()
  })

  it('CRFa: dígitos viram região-número na digitação (máscara insere o hífen)', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'CRFa')
    const campo = screen.getByPlaceholderText('ex.: 2-12345')
    await user.type(campo, '212345')
    expect(campo).toHaveValue('2-12345')
  })

  it('troca o rótulo e as opções do segundo campo conforme o conselho (UF/Região)', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    // Sem conselho: UF do registro (27 UFs).
    expect(screen.getByRole('combobox', { name: 'UF do registro' })).toBeInTheDocument()
    await escolherRegiao(user, 'UF do registro', 'SP')
    expect(screen.getByRole('combobox', { name: 'UF do registro' })).toHaveTextContent('SP')

    // CRP: vira Região do CRP com "06 (SP)" — o valor antigo (SP) é limpo.
    await escolherConselho(user, 'CRP')
    await escolherRegiao(user, 'Região do CRP', '06 (SP)')
    expect(screen.getByRole('combobox', { name: 'Região do CRP' })).toHaveTextContent('06 (SP)')

    // CREFITO: Região do CREFITO com "3 (SP)"; o "06" antigo não existe → limpo.
    await escolherConselho(user, 'CREFITO')
    expect(screen.getByRole('combobox', { name: 'Região do CREFITO' })).toBeInTheDocument()
    await escolherRegiao(user, 'Região do CREFITO', '3 (SP)')
    expect(screen.getByRole('combobox', { name: 'Região do CREFITO' })).toHaveTextContent('3 (SP)')

    // CRFa: Região do CRFa com "2 (SP)".
    await escolherConselho(user, 'CRFa')
    await escolherRegiao(user, 'Região do CRFa', '2 (SP)')
    expect(screen.getByRole('combobox', { name: 'Região do CRFa' })).toHaveTextContent('2 (SP)')
  })
})
