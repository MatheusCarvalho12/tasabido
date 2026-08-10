import { Check } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

const PASSOS = ['Quem é você?', 'Sobre você', 'Sua família', 'Finalizar']

interface CadastroProgressProps {
  /** Passo ativo, 1-based. Passos anteriores aparecem com check. */
  currentStep: number
}

/**
 * Progresso de 4 passos do cadastro: círculos conectados por linha.
 * Concluído: check (turquesa no mobile, azul no desktop). Ativo: azul com número.
 * A linha fica azul até o passo atual e cinza depois (mockup).
 */
export function CadastroProgress({ currentStep }: CadastroProgressProps) {
  return (
    <ol className="flex w-full items-start" aria-label="Progresso do cadastro">
      {PASSOS.map((label, index) => {
        const step = index + 1
        const concluido = step < currentStep
        const ativo = step === currentStep
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-[-50%] top-[19px] h-0.5 w-full',
                  step <= currentStep ? 'bg-blue' : 'bg-navy/15',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full text-lg font-bold',
                concluido
                  ? 'bg-turquoise text-white shadow-clay-btn lg:bg-blue'
                  : ativo
                    ? 'bg-blue text-white shadow-clay-btn'
                    : 'border border-border bg-white text-muted-foreground shadow-clay-sm',
              )}
            >
              {concluido ? <Check weight="bold" className="size-5" /> : step}
            </span>
            <span
              className={cn(
                'text-xs text-center leading-tight sm:text-sm',
                ativo || concluido ? 'font-bold text-navy' : 'font-semibold text-muted-foreground',
              )}
            >
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
