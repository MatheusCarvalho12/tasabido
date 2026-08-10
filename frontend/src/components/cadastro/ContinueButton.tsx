import { ArrowRight } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContinueButtonProps {
  disabled?: boolean
  onClick?: () => void
  className?: string
}

/**
 * Botão "Continuar" do fluxo de cadastro: pill azul com seta circular branca
 * à direita. Desabilitado (cinza) até o passo estar preenchido.
 */
export function ContinueButton({ disabled, onClick, className }: ContinueButtonProps) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative h-14 w-full rounded-full bg-blue px-8 text-lg font-bold text-white shadow-clay-btn transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0 disabled:bg-[#c9c4bd] disabled:text-white/80 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-[#c9c4bd] disabled:active:translate-y-0',
        className,
      )}
    >
      Continuar
      <span
        aria-hidden="true"
        className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-blue shadow-clay-sm transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0 group-disabled:text-[#a39d94]"
      >
        <ArrowRight weight="bold" className="size-6" />
      </span>
    </Button>
  )
}
