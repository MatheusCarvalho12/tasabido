import { User } from '@phosphor-icons/react'

/**
 * Pill roxa "Área do profissional" do mockup profissional:
 * ícone branco de profissional à esquerda, texto branco, sombra clay.
 */
export function ProfessionalBadge() {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full bg-purple-dark px-5 py-2 text-base font-bold text-white shadow-clay-sm sm:px-6 sm:py-2.5">
      <User weight="fill" aria-hidden="true" className="size-5" />
      Área do profissional
    </span>
  )
}
