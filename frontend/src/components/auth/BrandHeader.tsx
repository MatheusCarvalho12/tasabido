import type { ReactNode } from 'react'

import logo from '@/assets/logo.png'
import { cn } from '@/lib/utils'

interface BrandHeaderProps {
  /** Conteúdo exibido entre o logo e a tagline (ex.: pill "Área do profissional"). */
  badge?: ReactNode
  /** Alinhamento no desktop: 'start' (padrão) ou 'center' (mockup profissional). */
  align?: 'start' | 'center'
}

export function BrandHeader({ badge, align = 'start' }: BrandHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col items-center gap-4 text-center',
        align === 'start' && 'lg:items-start lg:text-left',
        align === 'center' && 'lg:items-center lg:text-center',
      )}
    >
      <img src={logo} alt="Tá Sabido" draggable={false} className="h-20 w-auto sm:h-24 lg:h-28" />
      {badge}
      <p className="max-w-md text-lg font-semibold leading-snug text-navy sm:text-xl">
        Conectando profissionais e famílias no cuidado de crianças neuroatípicas.
      </p>
    </header>
  )
}
