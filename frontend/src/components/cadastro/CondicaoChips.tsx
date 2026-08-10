import {
  ChatCircleDots,
  Check,
  Heart,
  Plus,
  PuzzlePiece,
  Star,
  TextAa,
} from '@phosphor-icons/react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Condicao } from '@/types/cadastro'

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
  const props = { weight: 'fill' as const, 'aria-hidden': true, className: 'size-6' }
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

interface CondicaoChipsProps {
  value: Condicao[]
  onValueChange: (values: Condicao[]) => void
}

/**
 * Chips multi-seleção de condições de desenvolvimento (passo 3):
 * contorno azul + check no canto quando ativo (mockup).
 */
export function CondicaoChips({ value, onValueChange }: CondicaoChipsProps) {
  return (
    <ToggleGroup
      multiple
      value={value}
      onValueChange={(values) => onValueChange(values as Condicao[])}
      aria-label="Condições de desenvolvimento"
      className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      {OPCOES.map((option) => (
        <ToggleGroupItem
          key={option.id}
          value={option.id}
          aria-label={option.label}
          className="group relative flex h-auto w-full items-center gap-2.5 rounded-2xl border-2 border-transparent bg-white px-4 py-3 shadow-clay-white transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-blue/50 hover:shadow-clay-sm focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/30 active:translate-y-0 data-pressed:border-blue data-pressed:bg-blue/10 data-pressed:shadow-clay-sm"
        >
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-blue text-white opacity-0 shadow-clay-sm transition-opacity group-data-pressed:opacity-100"
          >
            <Check weight="bold" className="size-3.5" />
          </span>
          <IconeCondicao id={option.id} className={option.iconClassName} />
          <span className="text-sm font-bold leading-tight text-navy sm:text-base">
            {option.label}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
