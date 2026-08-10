import { Check } from '@phosphor-icons/react'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { PapelFamiliar } from '@/types/cadastro'

interface PapelCardProps {
  option: { id: PapelFamiliar; label: string; avatar: string }
}

/**
 * Card de papel familiar: avatar + label, com check circular no canto superior
 * direito quando selecionado (outline azul + fundo azulado suave, mockup).
 */
function PapelCard({ option }: PapelCardProps) {
  return (
    <ToggleGroupItem
      value={option.id}
      aria-label={option.label}
      className="group relative flex h-auto w-full flex-col items-center gap-2.5 rounded-3xl border-2 border-transparent bg-white p-3 shadow-clay-white transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-turquoise/50 hover:shadow-clay-sm focus-visible:border-turquoise focus-visible:ring-3 focus-visible:ring-turquoise/30 active:translate-y-0 data-pressed:border-turquoise data-pressed:bg-turquoise/10 data-pressed:shadow-clay-sm sm:gap-3 sm:p-4 lg:data-pressed:border-blue lg:data-pressed:bg-blue/10 lg:hover:border-blue/50 lg:focus-visible:border-blue lg:focus-visible:ring-blue/30"
    >
      <span
        aria-hidden="true"
        className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-turquoise text-white opacity-0 shadow-clay-sm transition-opacity group-data-pressed:opacity-100 sm:right-3 sm:top-3 lg:bg-blue"
      >
        <Check weight="bold" className="size-4" />
      </span>
      <img
        src={option.avatar}
        alt=""
        draggable={false}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
      />
      <span className="text-base font-bold leading-tight text-navy sm:text-lg">{option.label}</span>
    </ToggleGroupItem>
  )
}

interface PapelGridProps {
  value: PapelFamiliar | null
  onValueChange: (papel: PapelFamiliar) => void
  options: { id: PapelFamiliar; label: string; avatar: string }[]
}

/**
 * Grid de seleção de papel (single-select): 2 colunas no mobile, 3 no desktop.
 * Usa ToggleGroup (navegação por setas inclusa) com estado real.
 */
export function PapelGrid({ value, onValueChange, options }: PapelGridProps) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(values) => {
        if (values[0]) onValueChange(values[0] as PapelFamiliar)
      }}
      aria-label="Papel na família"
      className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      {options.map((option) => (
        <PapelCard key={option.id} option={option} />
      ))}
    </ToggleGroup>
  )
}
