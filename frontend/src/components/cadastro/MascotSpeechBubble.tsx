import mascote from '@/assets/mascote.png'
import { cn } from '@/lib/utils'

interface MascotSpeechBubbleProps {
  className?: string
  /**
   * Lado da ponta: 'left' (mascote à esquerda do balão, mobile) ou 'bottom'
   * (mascote abaixo do balão, desktop). O balão SEMPRE aponta para o Sabidinho.
   */
  tail?: 'left' | 'bottom'
}

/**
 * Balão de fala do Sabidinho, sempre ancorado no personagem (regra: o balão
 * aponta para o mascote, nunca solto).
 */
export function MascotSpeechBubble({ className, tail = 'left' }: MascotSpeechBubbleProps) {
  return (
    <div
      className={cn(
        'relative max-w-[250px] rounded-2xl bg-white px-4 py-3 shadow-clay-white',
        tail === 'left' ? 'rounded-bl-sm' : 'rounded-b-sm',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute size-4 rotate-45 rounded-[3px] bg-white',
          tail === 'left' ? '-left-2 top-1/2 -translate-y-1/2' : '-bottom-2 left-[26%]',
        )}
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
