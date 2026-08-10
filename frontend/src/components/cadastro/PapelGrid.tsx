import { AvatarChip } from '@/components/cadastro/AvatarChip'
import { ToggleGroup } from '@/components/ui/toggle-group'
import type { PapelFamiliar } from '@/types/cadastro'

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
        <AvatarChip key={option.id} option={option} />
      ))}
    </ToggleGroup>
  )
}
