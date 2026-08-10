import { cn } from '@/lib/utils'

const PASSOS = ['Quem é você?', 'Sobre você', 'Sua família', 'Finalizar']

interface CadastroProgressProps {
  /** Passo ativo, 1-based. */
  currentStep: number
}

/**
 * Progresso de 4 passos do cadastro: círculos numerados conectados por linha.
 * Ativo: círculo turquesa (mobile) / azul (desktop) preenchido + label em negrito.
 */
export function CadastroProgress({ currentStep }: CadastroProgressProps) {
  return (
    <ol className="flex w-full items-start" aria-label="Progresso do cadastro">
      {PASSOS.map((label, index) => {
        const step = index + 1
        const ativo = step === currentStep
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-2">
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute left-[-50%] top-[19px] h-0.5 w-full bg-navy/15"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full text-lg font-bold',
                ativo
                  ? 'bg-turquoise text-white shadow-clay-btn lg:bg-blue'
                  : 'border border-border bg-white text-muted-foreground shadow-clay-sm',
              )}
            >
              {step}
            </span>
            <span
              className={cn(
                'text-xs text-center leading-tight sm:text-sm',
                ativo ? 'font-bold text-navy' : 'font-semibold text-muted-foreground',
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
