import { LockKey } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export const HOLD_MS = 600

interface PadlockButtonProps {
  /** Disparado quando o hold de 600ms completa. Padrão: navega para /pin. */
  onUnlocked?: () => void
  /** Aria-label do botão. */
  label?: string
  className?: string
}

/**
 * Cadeado discreto do header do modo criança (tela de jogos).
 *
 * Estados:
 * - idle: cadeado turquesa pequeno, sem anel;
 * - segurando (press-and-hold >= 600ms): anel de progresso enchendo ao redor;
 * - soltou antes de completar: volta ao idle, sem navegar;
 * - completou: `onUnlocked` (padrão: abre o fluxo de PIN em /pin).
 *
 * O anel é puramente visual (motion/react); o disparo real vem de um timer
 * de 600ms — testável com fake timers e imune a falhas de animação.
 */
export function PadlockButton({
  onUnlocked,
  label = 'Abrir a área dos pais',
  className,
}: PadlockButtonProps) {
  const navigate = useNavigate()
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const complete = () => {
    if (onUnlocked) {
      onUnlocked()
    } else {
      void navigate({ to: '/pin' })
    }
  }

  const startHold = () => {
    if (timerRef.current) {
      return
    }
    setHolding(true)
    navigator.vibrate?.(10)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setHolding(false)
      navigator.vibrate?.([20, 40, 20])
      complete()
    }, HOLD_MS)
  }

  const cancelHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={holding}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault()
          startHold()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          cancelHold()
        }
      }}
      className={cn(
        'relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-turquoise to-turquoise-dark text-white shadow-clay-sm outline-none transition-transform select-none',
        'hover:-translate-y-0.5 active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50',
        holding && 'scale-95',
        className,
      )}
    >
      <LockKey weight="fill" aria-hidden="true" className="size-6" />
      {/* Anel de progresso: enche em 600ms enquanto segura, volta se soltar. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="pointer-events-none absolute -inset-1.5 size-[calc(100%+12px)] -rotate-90"
      >
        <motion.circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-turquoise-dark"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: holding ? 1 : 0 }}
          transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
        />
      </svg>
    </button>
  )
}
