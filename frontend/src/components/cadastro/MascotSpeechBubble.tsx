import mascote from '@/assets/mascote.png'
import { cn } from '@/lib/utils'

interface MascotSpeechBubbleProps {
  className?: string
}

/**
 * Balão de fala do Sabidinho com ponteiro à esquerda, sempre ancorado no
 * personagem (regra: o balão aponta para o mascote, nunca solto).
 */
export function MascotSpeechBubble({ className }: MascotSpeechBubbleProps) {
  return (
    <div
      className={cn(
        'relative max-w-[250px] rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-clay-white',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 rounded-[3px] bg-white"
      />
      <p className="text-sm leading-snug font-semibold text-navy sm:text-base">
        Eu vou te ajudar em cada etapa.
      </p>
    </div>
  )
}

/** Mascote pequeno + balão, conjunto centralizado (mockup mobile). */
export function MascotSpeechRow() {
  return (
    <div className="flex items-center justify-center gap-3">
      <img
        src={mascote}
        alt="Sabidinho, o mascote do Tá Sabido"
        draggable={false}
        className="size-16 shrink-0 object-contain sm:size-20"
      />
      <MascotSpeechBubble />
    </div>
  )
}
