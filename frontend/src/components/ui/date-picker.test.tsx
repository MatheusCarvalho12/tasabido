import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DatePicker } from '@/components/ui/date-picker'

interface HarnessProps {
  value?: string
  onChange?: (value: string) => void
}

function renderPicker({ value = '', onChange = () => {} }: HarnessProps = {}) {
  const onBlur = () => {}
  render(
    <DatePicker
      id="data"
      name="data"
      label="Data de nascimento"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      hasError={false}
    />,
  )
}

async function abrirPainel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /data de nascimento/i }))
  await screen.findByRole('tab', { name: 'Dia' })
}

describe('DatePicker Tá Sabido', () => {
  it('abre com o valor existente e mostra o mês/ano correspondentes', async () => {
    const user = userEvent.setup()
    renderPicker({ value: '15/08/1990' })
    await abrirPainel(user)

    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('Agosto')
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('1990')
    expect(screen.getByRole('tab', { name: 'Dia' })).toHaveAttribute('aria-selected', 'true')
  })

  it('navega dezembro → janeiro pela seta e mantém o dropdown do mês em dia', async () => {
    const user = userEvent.setup()
    renderPicker({ value: '15/08/1990' })
    await abrirPainel(user)

    await user.click(screen.getByRole('tab', { name: 'Mês' }))
    await user.click(screen.getByRole('button', { name: 'Dezembro' }))
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('Dezembro')

    await user.click(screen.getByRole('button', { name: 'Próximo mês' }))
    // Janeiro é o mês 0 — o dropdown precisa continuar exibindo o rótulo.
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('Janeiro')
    expect(screen.getByRole('combobox', { name: 'Ano' })).toHaveTextContent('1991')
    const painelDia = screen.getByRole('tabpanel', { name: 'Dia' })
    expect(within(painelDia).getByText('1')).toBeInTheDocument()
  })

  it('escolhe uma data pelas abas Ano → Mês → Dia e aplica no formato dd/mm/aaaa', async () => {
    const user = userEvent.setup()
    let aplicada = ''
    renderPicker({ onChange: (value) => (aplicada = value) })
    await abrirPainel(user)

    await user.click(screen.getByRole('tab', { name: 'Ano' }))
    // Página 0 = anos mais recentes; volta até achar 1990.
    for (let tentativas = 0; tentativas < 12; tentativas += 1) {
      if (screen.queryByRole('button', { name: '1990' })) {
        break
      }
      await user.click(screen.getByRole('button', { name: 'Página de anos anterior' }))
    }
    await user.click(screen.getByRole('button', { name: '1990' }))
    await user.click(screen.getByRole('tab', { name: 'Mês' }))
    await user.click(screen.getByRole('button', { name: 'Agosto' }))
    const painelDia = screen.getByRole('tabpanel', { name: 'Dia' })
    await user.click(within(painelDia).getByText('15'))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(aplicada).toBe('15/08/1990')
    expect(screen.queryByRole('tab', { name: 'Dia' })).not.toBeInTheDocument()
  })

  it('mantém Aplicar desabilitado enquanto nenhum dia foi escolhido', async () => {
    const user = userEvent.setup()
    renderPicker()
    await abrirPainel(user)

    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()

    await user.click(screen.getByRole('tab', { name: 'Mês' }))
    await user.click(screen.getByRole('button', { name: 'Agosto' }))
    const painelDia = screen.getByRole('tabpanel', { name: 'Dia' })
    await user.click(within(painelDia).getByText('10'))
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeEnabled()
  })

  it('não tem botão Limpar nem legenda de disponibilidade', async () => {
    const user = userEvent.setup()
    renderPicker()
    await abrirPainel(user)

    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Disponível|Poucas vagas|Indisponível/)).not.toBeInTheDocument()
  })
})
