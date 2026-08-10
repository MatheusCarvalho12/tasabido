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
    expect(screen.getByPlaceholderText('ex.: 12345')).toBeInTheDocument()

    await escolherConselho(user, 'CRO')
    expect(screen.getByPlaceholderText('ex.: 123456')).toBeInTheDocument()
  })

  it('limpa o número do registro com aviso quando ele não cabe na regra do novo conselho', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'Outro')
    await user.type(screen.getByPlaceholderText('ex.: 123456'), '1234567')

    // 7 dígitos cabem em Outro (4–10), não cabem em CRM (4–6): limpa + avisa.
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

  it('valida o tamanho do número ao sair do campo (4–6; Outro até 10)', async () => {
    const user = userEvent.setup()
    await renderAtuacaoPage()

    await escolherConselho(user, 'CRM')
    await user.type(screen.getByPlaceholderText('ex.: 123456'), '1234567')
    await user.click(screen.getByRole('combobox', { name: 'Conselho profissional' }))
    expect(
      screen.getByText('O número do registro do CRM tem no máximo 6 dígitos.'),
    ).toBeInTheDocument()
  })
})
