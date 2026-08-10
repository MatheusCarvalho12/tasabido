import { AvatarChip } from '@/components/cadastro/AvatarChip'
import { ToggleGroup } from '@/components/ui/toggle-group'

interface ProfissaoGridProps {
  value: string | null
  onValueChange: (value: string) => void
  options: { id: string; label: string; avatar: string }[]
}

/**
 * Grid de seleção de profissão (single-select): 2 colunas no mobile, 4 no
 * desktop (mockup 4x2). Reusa AvatarChip + ToggleGroup do cadastro familiar.
 */
export function ProfissaoGrid({ value, onValueChange, options }: ProfissaoGridProps) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(values) => {
        if (values[0]) onValueChange(values[0])
      }}
      aria-label="Profissão"
      className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {options.map((option) => (
        <AvatarChip key={option.id} option={option} />
      ))}
    </ToggleGroup>
  )
}
