import { fireEvent, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { GameForm } from '@/components/profissional/GameForm'
import { MSG_CATEGORIA, MSG_DESCRICAO, MSG_TITULO, MSG_TUTORIAL } from '@/lib/games'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

beforeAll(() => {
  // jsdom não implementa object URLs — o preview do upload depende deles.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:preview-teste'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  })
})

afterAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: originalCreateObjectURL,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: originalRevokeObjectURL,
  })
})

function preencherCamposObrigatorios() {
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Escreva seu nome' } })
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'escrita' } })
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: 'Escreva seu nome passando o dedo sobre as letras pontilhadas.' },
  })
  fireEvent.change(screen.getByLabelText('Tutorial'), {
    target: { value: 'Passe o dedo sobre cada letra, uma por uma.' },
  })
}

describe('GameForm', () => {
  it('valida os campos obrigatórios no salvar sem preencher', () => {
    const onSubmit = vi.fn()
    render(<GameForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))

    expect(screen.getByText(MSG_TITULO)).toBeInTheDocument()
    expect(screen.getByText(MSG_CATEGORIA)).toBeInTheDocument()
    expect(screen.getByText(MSG_DESCRICAO)).toBeInTheDocument()
    expect(screen.getByText(MSG_TUTORIAL)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('título com 1 letra é inválido (mesma regra do backend)', () => {
    render(<GameForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))

    expect(screen.getByText(MSG_TITULO)).toBeInTheDocument()
  })

  it('salvar rascunho envia os valores sem publicar', () => {
    const onSubmit = vi.fn()
    render(<GameForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    preencherCamposObrigatorios()
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [values, files, publish] = onSubmit.mock.calls[0]
    expect(values).toMatchObject({
      titulo: 'Escreva seu nome',
      categoria: 'escrita',
      visibilidade: 'public',
    })
    expect(files).toEqual({ svg: null, thumb: null, banner: null })
    expect(publish).toBe(false)
  })

  it('publicar envia publish=true', () => {
    const onSubmit = vi.fn()
    render(<GameForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    preencherCamposObrigatorios()
    fireEvent.click(screen.getByRole('button', { name: /Criar e publicar/ }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][2]).toBe(true)
  })

  it('upload de SVG válido exibe o preview do arquivo', () => {
    render(<GameForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'traco.svg', {
      type: 'image/svg+xml',
    })
    fireEvent.change(screen.getByLabelText('Escolher traçado do jogo (svg)'), {
      target: { files: [svg] },
    })

    expect(screen.getByAltText('Prévia do arquivo escolhido')).toHaveAttribute(
      'src',
      'blob:preview-teste',
    )
    expect(screen.getByText('traco.svg')).toBeInTheDocument()
    expect(screen.getByText('Arquivo pronto para enviar ao salvar')).toBeInTheDocument()
  })

  it('upload de thumbnail exibe o preview da imagem', () => {
    render(<GameForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const thumb = new File(['fake-image'], 'capa.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Escolher thumbnail do jogo'), {
      target: { files: [thumb] },
    })

    expect(screen.getByAltText('Prévia do arquivo escolhido')).toHaveAttribute(
      'src',
      'blob:preview-teste',
    )
    expect(screen.getByText('capa.png')).toBeInTheDocument()
  })

  it('arquivo com extensão errada mostra erro e não seleciona', () => {
    const onSubmit = vi.fn()
    render(<GameForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    const txt = new File(['nada'], 'notas.txt', { type: 'text/plain' })
    fireEvent.change(screen.getByLabelText('Escolher traçado do jogo (svg)'), {
      target: { files: [txt] },
    })

    expect(screen.getByText('O arquivo precisa ser um SVG (.svg)')).toBeInTheDocument()
    expect(screen.queryByAltText('Prévia do arquivo escolhido')).not.toBeInTheDocument()
  })

  it('imagem acima de 1 MB mostra erro de tamanho', () => {
    render(<GameForm onSubmit={vi.fn()} onCancel={vi.fn()} />)

    const grande = new File([new Uint8Array(1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Escolher banner do jogo'), {
      target: { files: [grande] },
    })

    expect(screen.getByText('A imagem precisa ter no máximo 1 MB')).toBeInTheDocument()
  })

  it('seleção de cores entra no payload (máximo 3)', () => {
    const onSubmit = vi.fn()
    render(<GameForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cor #04A4AB' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cor #0D79F0' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cor #F6552D' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cor #F29E21' }))

    preencherCamposObrigatorios()
    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))

    expect(onSubmit.mock.calls[0][0].cores).toEqual(['#04A4AB', '#0D79F0', '#F6552D'])
    expect(onSubmit.mock.calls[0][0].cores).toHaveLength(3)
  })
})
