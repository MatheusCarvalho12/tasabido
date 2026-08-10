import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { CondicaoChips } from '@/components/cadastro/CondicaoChips'

/** Harness com estado real: o componente é re-renderizado a cada mudança. */
function Harness({ initial }: { initial: string[] }) {
  const [value, setValue] = useState(initial)
  return <CondicaoChips value={value} onValueChange={setValue} />
}

function renderChips(initial: string[] = []) {
  return render(<Harness initial={initial} />)
}

describe('CondicaoChips (condições customizadas)', () => {
  it('mostra os 5 chips padrão + o botão Outra', () => {
    renderChips()
    for (const label of ['TEA', 'TDAH', 'Dislexia', 'TOD', 'Atraso de fala', 'Outra']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('cria um chip custom ao digitar e apertar Enter no campo aberto por Outra', async () => {
    const user = userEvent.setup()
    renderChips()

    await user.click(screen.getByRole('button', { name: 'Outra' }))
    const input = screen.getByLabelText('Nova condição personalizada')
    await user.type(input, 'Sensibilidade alimentar{Enter}')

    const chip = screen.getByRole('button', { name: 'Sensibilidade alimentar' })
    expect(chip).toBeInTheDocument()
    // O chip criado já nasce selecionado (foi adicionado porque se aplica) e pode ser desmarcado.
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('não duplica condição custom com texto igual (ignorando maiúsculas)', async () => {
    const user = userEvent.setup()
    renderChips(['Sensibilidade alimentar'])

    await user.click(screen.getByRole('button', { name: 'Outra' }))
    await user.type(
      screen.getByLabelText('Nova condição personalizada'),
      'sensibilidade ALIMENTAR{Enter}',
    )

    expect(screen.getAllByRole('button', { name: 'Sensibilidade alimentar' })).toHaveLength(1)
  })

  it('desabilita Outra ao atingir o limite de 15 customizadas', () => {
    const muitas = Array.from({ length: 15 }, (_, i) => `Condição ${i + 1}`)
    renderChips(muitas)

    expect(screen.getByRole('button', { name: 'Outra' })).toBeDisabled()
  })
})
