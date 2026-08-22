/**
 * Barra de progresso e feedback qualitativo em português do Brasil (Ticket A2/A3).
 * NUNCA exibe pontuação numérica ou percentual para a criança.
 */

import { HandTap, Sparkle, Star, Timer } from '@phosphor-icons/react'

import type { TracingScore, TracingState } from '@/lib/tracing/types'

export interface TracingFeedbackBarProps {
  state: TracingState
  score: TracingScore
  className?: string
}

export function TracingFeedbackBar({ state, score, className = '' }: TracingFeedbackBarProps) {
  // Converte a pontuação interna para largura percentual da barra visual
  const progressPercent = Math.min(100, Math.max(0, Math.round(score.overall * 100)))

  // Cópia qualitativa em português brasileiro (nunca numérica)
  let copy = 'Passe o dedinho por cima da letra!'
  let icon = <HandTap weight="bold" className="size-6 text-turquoise" />
  let barColor = 'bg-blue'

  if (state === 'completed') {
    copy = 'Parabéns! Letra perfeita!'
    icon = (
      <Star
        weight="fill"
        className="size-6 text-kid-star animate-pulse motion-reduce:animate-none"
      />
    )
    barColor = 'bg-kid-star'
  } else if (state === 'valid_touching') {
    copy = 'Muito bem! Agora solte o dedinho!'
    icon = (
      <Sparkle
        weight="fill"
        className="size-6 text-kid-star animate-bounce motion-reduce:animate-none"
      />
    )
    barColor = 'bg-kid-star'
  } else if (state === 'grace') {
    copy = 'Pode continuar! Volte a desenhar.'
    icon = <Timer weight="bold" className="size-6 text-coral" />
    barColor = 'bg-coral'
  } else if (state === 'drawing') {
    if (progressPercent > 60) {
      copy = 'Muito bem! Você está quase lá!'
      icon = <Sparkle weight="fill" className="size-6 text-blue" />
      barColor = 'bg-blue'
    } else if (progressPercent > 25) {
      copy = 'Continue desenhando no caminho!'
      icon = <Sparkle weight="fill" className="size-6 text-turquoise" />
      barColor = 'bg-turquoise'
    } else {
      copy = 'Isso! Siga a linha da letra...'
      icon = <HandTap weight="bold" className="size-6 text-turquoise" />
      barColor = 'bg-turquoise'
    }
  } else if (state === 'reset' || state === 'invalid') {
    copy = 'Vamos tentar de novo com calma!'
    icon = <HandTap weight="bold" className="size-6 text-coral" />
    barColor = 'bg-coral'
  }

  return (
    <div className={`w-full max-w-md flex flex-col items-center gap-2 ${className}`}>
      {/* Mensagem encorajadora qualitativa */}
      <div className="flex items-center gap-2 px-3 py-1 text-center">
        <span aria-hidden="true">{icon}</span>
        <p className="text-lg md:text-xl font-extrabold text-navy leading-tight">{copy}</p>
      </div>

      {/* Barra de progresso visual (sem números para a criança) */}
      <div
        role="progressbar"
        aria-label="Progresso do traçado"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-4 sm:h-5 bg-kid-bg rounded-full p-1 border-2 border-border shadow-inner relative overflow-hidden"
      >
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-200 ease-out`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
