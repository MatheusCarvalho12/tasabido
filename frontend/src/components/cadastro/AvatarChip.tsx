import { Check } from '@phosphor-icons/react'

import { ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

interface AvatarChipProps {
  option: { id: string; label: string; avatar: string }
  /**
   * 'md': card do passo 1 (avatar grande, empilhado).
   * 'sm': chip da rede de apoio (avatar menor, avatar+label em linha).
   */
  size?: 'md' | 'sm'
  className?: string
}

/**
 * Chip com avatar + label e check circular no canto quando selecionado
 * (outline azul + fundo azulado suave, mockup). Usado nos passos 1 e 3.
 */
export function AvatarChip({ option, size = 'md', className }: AvatarChipProps) {
  return (
    <ToggleGroupItem
      value={option.id}
      aria-label={option.label}
      className={cn(
        'group relative flex h-auto w-full flex-col items-center gap-2.5 rounded-3xl border-2 border-transparent bg-white p-3 shadow-clay-white transition-[transform,border-color,background-color,box-shadow] hover:-translate-y-0.5 hover:border-turquoise/50 hover:shadow-clay-sm focus-visible:border-turquoise focus-visible:ring-3 focus-visible:ring-turquoise/30 active:translate-y-0 data-pressed:border-turquoise data-pressed:bg-turquoise/10 data-pressed:shadow-clay-sm sm:gap-3 sm:p-4 lg:data-pressed:border-blue lg:data-pressed:bg-blue/10 lg:hover:border-blue/50 lg:focus-visible:border-blue lg:focus-visible:ring-blue/30',
        size === 'sm' &&
          'flex-row gap-2.5 rounded-2xl p-2.5 sm:gap-3 sm:p-3 lg:hover:border-turquoise/50 lg:focus-visible:border-turquoise lg:focus-visible:ring-turquoise/30 lg:data-pressed:border-turquoise lg:data-pressed:bg-turquoise/10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full bg-turquoise text-white opacity-0 shadow-clay-sm transition-opacity group-data-pressed:opacity-100 sm:right-3 sm:top-3 lg:bg-blue',
          size === 'sm' && 'right-1.5 top-1.5 size-6 sm:right-2 sm:top-2 lg:bg-turquoise',
        )}
      >
        <Check weight="bold" className="size-4" />
      </span>
      <img
        src={option.avatar}
        alt=""
        draggable={false}
        className={cn(
          'h-16 w-16 object-contain sm:h-20 sm:w-20',
          size === 'sm' && 'h-10 w-10 sm:h-12 sm:w-12',
        )}
      />
      <span
        className={cn(
          'text-base font-bold leading-tight text-navy sm:text-lg',
          size === 'sm' && 'text-sm sm:text-base',
        )}
      >
        {option.label}
      </span>
    </ToggleGroupItem>
  )
}
