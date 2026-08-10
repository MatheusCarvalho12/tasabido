import { AvatarChip } from '@/components/cadastro/AvatarChip'
import { ToggleGroup } from '@/components/ui/toggle-group'

interface PapelGridProps {
  value: string | null
  onValueChange: (value: string) => void
  options: { id: string; label: string; avatar: string }[]
  /** Rótulo acessível do grid (família: "Papel na família"; profissional: "Profissão"). */
  ariaLabel?: string
}

/**
 * Grid de seleção por avatar (single-select): 2 colunas no mobile, 3 no
 * desktop. Usa ToggleGroup (navegação por setas inclusa) com estado real.
 * Genérico o suficiente para papéis da família e profissões.
 */
export function PapelGrid({
  value,
  onValueChange,
  options,
  ariaLabel = 'Papel na família',
}: PapelGridProps) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(values) => {
        if (values[0]) onValueChange(values[0])
      }}
      aria-label={ariaLabel}
      className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
    >
      {options.map((option) => (
        <AvatarChip key={option.id} option={option} />
      ))}
    </ToggleGroup>
  )
}
