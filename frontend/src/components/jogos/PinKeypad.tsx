import { Backspace } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

interface PinKeypadProps {
  /** Chamado com o dígito pressionado ('0'-'9'). */
  onDigit: (digit: string) => void
  /** Chamado no botão de apagar. */
  onBackspace: () => void
  /** Desabilita os botões (ex.: validando). */
  disabled?: boolean
  className?: string
}

/**
 * Teclado numérico clay do PIN dos pais: 1-9, 0 e backspace.
 * Botões redondos creme com sombra, dígitos navy bold (referência canônica).
 */
export function PinKeypad({ onDigit, onBackspace, disabled = false, className }: PinKeypadProps) {
  const keyClass = cn(
    'grid aspect-square w-full cursor-pointer place-items-center rounded-full',
    'bg-gradient-to-b from-white to-[#f4efe8] text-navy shadow-[0_10px_18px_rgb(100_85_65/0.18)]',
    'transition-[transform,box-shadow] outline-none select-none',
    'hover:-translate-y-0.5 hover:shadow-[0_14px_22px_rgb(100_85_65/0.22)]',
    'active:translate-y-0 active:scale-95',
    'focus-visible:ring-3 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:opacity-50',
  )

  return (
    <div
      className={cn(
        'grid w-full max-w-75 grid-cols-3 gap-x-5 gap-y-4 sm:gap-x-6 sm:gap-y-5',
        className,
      )}
      role="group"
      aria-label="Teclado do PIN"
    >
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          aria-label={`Dígito ${digit}`}
          disabled={disabled}
          onClick={() => onDigit(digit)}
          className={keyClass}
        >
          <span className="text-4xl font-extrabold text-navy sm:text-5xl">{digit}</span>
        </button>
      ))}
      {/* Canto vazio do teclado (referência: sem tecla no 4º row à esquerda) */}
      <div aria-hidden="true" />
      <button
        type="button"
        aria-label="Dígito 0"
        disabled={disabled}
        onClick={() => onDigit('0')}
        className={keyClass}
      >
        <span className="text-4xl font-extrabold text-navy sm:text-5xl">0</span>
      </button>
      <button
        type="button"
        aria-label="Apagar último dígito"
        disabled={disabled}
        onClick={onBackspace}
        className={keyClass}
      >
        <Backspace weight="bold" aria-hidden="true" className="size-9 text-blue-dark sm:size-10" />
      </button>
    </div>
  )
}
