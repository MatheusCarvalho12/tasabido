import { Heart, Plus, Star } from '@phosphor-icons/react'

/**
 * Formas decorativas "clay" dos cantos do mockup (turquesa, coral, roxo)
 * + símbolos flutuantes (estrela, coração, mais). Puramente decorativas.
 */
export function ClayBlobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* blob turquesa — canto superior direito */}
      <div className="clay-blob absolute -right-16 -top-14 size-60 rotate-12 rounded-[42%_58%_60%_40%/55%_45%_60%_40%] bg-gradient-to-br from-turquoise-light via-turquoise to-turquoise-dark opacity-90 sm:size-80" />

      {/* blob coral — canto inferior direito */}
      <div className="clay-blob absolute -bottom-20 -right-10 size-52 -rotate-6 rounded-[55%_45%_40%_60%/45%_55%_50%_50%] bg-gradient-to-br from-[#f8784f] via-coral to-coral-dark opacity-90 sm:size-72" />

      {/* blob roxo — canto inferior esquerdo */}
      <div className="clay-blob absolute -bottom-24 -left-16 size-60 rotate-12 rounded-[50%_50%_45%_55%/55%_40%_60%_45%] bg-gradient-to-br from-purple to-purple-dark opacity-80 sm:size-80" />

      {/* símbolos flutuantes (desktop) */}
      <Star
        weight="fill"
        className="absolute left-[10%] top-[12%] hidden size-9 -rotate-6 text-yellow drop-shadow-[0_8px_12px_rgb(242_158_33/0.45)] lg:block"
      />
      <Plus
        weight="bold"
        className="absolute bottom-[16%] left-[4%] hidden size-8 rotate-6 text-purple-dark drop-shadow-[0_8px_12px_rgb(95_63_176/0.4)] lg:block"
      />
      <Heart
        weight="fill"
        className="absolute right-[7%] top-[18%] hidden size-8 rotate-12 text-coral drop-shadow-[0_8px_12px_rgb(246_85_45/0.4)] lg:block"
      />
    </div>
  )
}
