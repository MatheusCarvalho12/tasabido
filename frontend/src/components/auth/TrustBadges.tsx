import { Heart, Lock, ShieldCheck } from '@phosphor-icons/react'
import { Fragment } from 'react'

import { cn } from '@/lib/utils'

interface TrustBadgesProps {
  /**
   * Rótulo longo do selo "Feito com carinho" no desktop (ex.: "…para profissionais").
   * Quando omitido, o rótulo curto "Feito com carinho" vale em todos os tamanhos.
   */
  desktopHeartLabel?: string
  /** Alinhamento dos selos: 'start' (padrão, telas alinhadas à esquerda) ou 'center'. */
  align?: 'start' | 'center'
}

export function TrustBadges({ desktopHeartLabel, align = 'start' }: TrustBadgesProps) {
  const items = [
    { icon: ShieldCheck, label: 'Seguro', className: 'text-turquoise' },
    { icon: Lock, label: 'Privado', className: 'text-purple' },
    {
      icon: Heart,
      label: 'Feito com carinho',
      desktopLabel: desktopHeartLabel,
      className: 'text-coral',
    },
  ]

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-2',
        align === 'start' && 'lg:justify-start',
      )}
    >
      {items.map(({ icon: Icon, label, desktopLabel, className }, index) => (
        <Fragment key={label}>
          {index > 0 && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-navy/25" />
          )}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Icon weight="fill" aria-hidden="true" className={cn('size-5 shrink-0', className)} />
            {desktopLabel ? (
              <>
                <span className="lg:hidden">{label}</span>
                <span className="hidden lg:inline">{desktopLabel}</span>
              </>
            ) : (
              label
            )}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
