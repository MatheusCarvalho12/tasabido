'use client'

import {
  ChatCircleDots,
  Check,
  Heart,
  Plus,
  PuzzlePiece,
  Star,
  Tag,
  TextAa,
} from '@phosphor-icons/react'
import type { KeyboardEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { Condicao } from '@/types/cadastro'

/** Limite de condições customizadas adicionadas pelo chip "Outra". */
export const LIMITE_CONDICOES_CUSTOM = 15

/** Comprimento máximo do texto de uma condição customizada. */
const MAX_TEXTO_CUSTOM = 40

interface CondicaoOption {
  id: Condicao
  label: string
  iconClassName: string
}

const OPCOES: CondicaoOption[] = [
  { id: 'tea', label: 'TEA', iconClassName: 'text-turquoise' },
  { id: 'tdah', label: 'TDAH', iconClassName: 'text-purple' },
  { id: 'dislexia', label: 'Dislexia', iconClassName: 'text-blue' },
  { id: 'tod', label: 'TOD', iconClassName: 'text-coral' },
  { id: 'atraso_fala', label: 'Atraso de fala', iconClassName: 'text-yellow' },
  { id: 'outra', label: 'Outra', iconClassName: 'text-purple' },
]

function IconeCondicao({ id, className }: { id: Condicao; className: string }) {
  const props = { weight: 'fill' as const, 'aria-hidden': true, className: 'size-6 shrink-0' }
  switch (id) {
    case 'tea':
      return <PuzzlePiece {...props} className={`${props.className} ${className}`} />
    case 'tdah':
      return <Star {...props} className={`${props.className} ${className}`} />
    case 'dislexia':
      return <TextAa {...props} className={`${props.className} ${className}`} />
    case 'tod':
      return <Heart {...props} className={`${props.className} ${className}`} />
    case 'atraso_fala':
      return <ChatCircleDots {...props} className={`${props.className} ${className}`} />
    case 'outra':
      return <Plus weight="bold" aria-hidden="true" className={`${props.className} ${className}`} />
  }
}

/** Classe comum de todos os chips (padrão e custom) — sem vazar conteúdo. */
const CLASSE_CHIP =
  'group relative flex h-auto min-w-0 w-full items-center gap-2.5 rounded-2xl border-2 border-transparent bg-white px-4 py-3 shadow-clay-white transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-blue/50 hover:shadow-clay-sm focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/30 active:translate-y-0 data-pressed:border-blue data-pressed:bg-blue/10 data-pressed:shadow-clay-sm'

/** Rótulos quebram em até 2 linhas (o toggle do Base UI força nowrap — corrigir aqui). */
const CLASSE_TEXTO_CHIP =
  'min-w-0 whitespace-normal text-sm font-bold leading-tight text-navy sm:text-base'

interface CondicaoChipsProps {
  value: string[]
  onValueChange: (values: string[]) => void
}

/**
 * Chips multi-seleção de condições de desenvolvimento (passo 3): os 5 padrão
 * + customizações. Clicar em "Outra" abre um campo de texto; Enter cria um
 * chip selecionável igual aos demais. Limite de 15 condições customizadas.
 */
export function CondicaoChips({ value, onValueChange }: CondicaoChipsProps) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Foco no campo ao abrir (autofocus via atributo é bloqueado pela regra a11y).
  useEffect(() => {
    if (aberto) {
      inputRef.current?.focus()
    }
  }, [aberto])

  const idsPadrao = new Set(OPCOES.map((option) => option.id))
  const custom = value.filter((condicao) => !idsPadrao.has(condicao as Condicao))
  const limiteAtingido = custom.length >= LIMITE_CONDICOES_CUSTOM

  const adicionarCustom = () => {
    const limpo = texto.trim()
    if (!limpo || limiteAtingido) {
      return
    }
    if (value.some((condicao) => condicao.toLowerCase() === limpo.toLowerCase())) {
      setTexto('')
      setAberto(false)
      return
    }
    onValueChange([...value, limpo])
    setTexto('')
    setAberto(false)
  }

  const tecladoInput = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      adicionarCustom()
    } else if (event.key === 'Escape') {
      setTexto('')
      setAberto(false)
    }
  }

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <ToggleGroup
        multiple
        value={value}
        onValueChange={(values) => onValueChange(values as string[])}
        aria-label="Condições de desenvolvimento"
        className="contents"
      >
        {OPCOES.filter((option) => option.id !== 'outra').map((option) => (
          <ToggleGroupItem
            key={option.id}
            value={option.id}
            aria-label={option.label}
            className={CLASSE_CHIP}
          >
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-blue text-white opacity-0 shadow-clay-sm transition-opacity group-data-pressed:opacity-100"
            >
              <Check weight="bold" className="size-3.5" />
            </span>
            <IconeCondicao id={option.id} className={option.iconClassName} />
            <span className={CLASSE_TEXTO_CHIP}>{option.label}</span>
          </ToggleGroupItem>
        ))}

        {custom.map((condicao) => (
          <ToggleGroupItem
            key={condicao}
            value={condicao}
            aria-label={condicao}
            title={condicao}
            className={cn(CLASSE_CHIP, 'col-span-full')}
          >
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-blue text-white opacity-0 shadow-clay-sm transition-opacity group-data-pressed:opacity-100"
            >
              <Check weight="bold" className="size-3.5" />
            </span>
            <Tag weight="fill" aria-hidden="true" className="size-6 shrink-0 text-purple" />
            {/* Linha cheia: o texto custom cabe inteiro, sem truncar nem fragmentar. */}
            <span className={cn(CLASSE_TEXTO_CHIP, 'break-words')}>{condicao}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* "Outra": abre o campo para adicionar condições customizadas. */}
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="dialog"
        disabled={limiteAtingido}
        title={
          limiteAtingido ? `Limite de ${LIMITE_CONDICOES_CUSTOM} condições atingido` : undefined
        }
        onClick={() => setAberto((atual) => !atual)}
        className={cn(
          CLASSE_CHIP,
          'justify-start',
          aberto && 'border-blue bg-blue/10 shadow-clay-sm',
          limiteAtingido && 'pointer-events-none opacity-40',
        )}
      >
        <IconeCondicao id="outra" className="text-purple" />
        <span className={CLASSE_TEXTO_CHIP}>Outra</span>
      </button>

      {aberto && (
        <div className="col-span-full">
          <label htmlFor="condicao-custom" className="sr-only">
            Nova condição personalizada
          </label>
          <input
            id="condicao-custom"
            ref={inputRef}
            type="text"
            maxLength={MAX_TEXTO_CUSTOM}
            placeholder="Escreva a condição e aperte Enter"
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            onKeyDown={tecladoInput}
            onBlur={() => setAberto(false)}
            className="h-12 w-full rounded-2xl border-2 border-blue/40 bg-white px-4 text-base font-semibold text-navy shadow-clay-white placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-blue focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue/30"
          />
        </div>
      )}
    </div>
  )
}
