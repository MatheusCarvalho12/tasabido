import { Heart, Lock, ShieldCheck } from '@phosphor-icons/react'
import { Fragment } from 'react'

import { cn } from '@/lib/utils'

const items = [
  { icon: ShieldCheck, label: 'Seguro', className: 'text-turquoise' },
  { icon: Lock, label: 'Privado', className: 'text-purple' },
  { icon: Heart, label: 'Feito com carinho', className: 'text-coral' },
]

export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:justify-start">
      {items.map(({ icon: Icon, label, className }, index) => (
        <Fragment key={label}>
          {index > 0 && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-navy/25" />
          )}
          <span className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Icon weight="fill" aria-hidden="true" className={cn('size-5 shrink-0', className)} />
            {label}
          </span>
        </Fragment>
      ))}
    </div>
  )
}
