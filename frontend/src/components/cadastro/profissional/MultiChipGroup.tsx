'use client'

import { Check } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { CLASSE_CHIP, CLASSE_TEXTO_CHIP } from '@/components/cadastro/CondicaoChips'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

interface MultiChipOption {
  id: string
  label: string
  /** Ícone Phosphor colorido (mesmo estilo dos chips de condições). */
  icon: ReactNode
}

interface MultiChipGroupProps {
  value: string[]
  onValueChange: (values: string[]) => void
  options: MultiChipOption[]
  /** Rótulo acessível do grupo (ex.: "Faixa etária que atende"). */
  ariaLabel: string
  className?: string
}

/**
 * Chips multi-seleção genéricos (faixas etárias, modalidades de atendimento),
 * mesmo visual dos chips de condições do cadastro familiar: check circular
 * azul no canto + borda azul quando selecionado.
 */
export function MultiChipGroup({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
}: MultiChipGroupProps) {
  return (
    <ToggleGroup
      multiple
      value={value}
      onValueChange={(values) => onValueChange(values as string[])}
      aria-label={ariaLabel}
      className={cn('grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3', className)}
    >
      {options.map((option) => (
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
          {option.icon}
          <span className={CLASSE_TEXTO_CHIP}>{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
