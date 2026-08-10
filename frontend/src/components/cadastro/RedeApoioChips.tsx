import { AvatarChip } from '@/components/cadastro/AvatarChip'
import { PAPEIS_FAMILIARES } from '@/components/cadastro/papeis'
import { ToggleGroup } from '@/components/ui/toggle-group'
import type { PapelFamiliar } from '@/types/cadastro'

interface RedeApoioChipsProps {
  value: PapelFamiliar[]
  onValueChange: (values: PapelFamiliar[]) => void
}

/**
 * Chips multi-seleção da rede de apoio (passo 3): avatares dos papéis
 * familiares, sem pré-seleção (validado com o usuário em outra etapa).
 */
export function RedeApoioChips({ value, onValueChange }: RedeApoioChipsProps) {
  return (
    <ToggleGroup
      multiple
      value={value}
      onValueChange={(values) => onValueChange(values as PapelFamiliar[])}
      aria-label="Quem mais participa do cuidado"
      className="grid w-full grid-cols-2 gap-3 sm:gap-4"
    >
      {PAPEIS_FAMILIARES.map((option) => (
        <AvatarChip key={option.id} option={option} size="sm" />
      ))}
    </ToggleGroup>
  )
}
