import { ArrowsClockwise } from '@phosphor-icons/react'
import { useState } from 'react'

/**
 * Lock horizontal do modo criança: no celular em pé (portrait, < 768px) um
 * aviso de giro cobre a tela; desktop e landscape ficam livres. Dá pra
 * dispensar ("Continuar mesmo assim") — rotação pode estar desabilitada no
 * aparelho.
 */
export function RotateHint() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-5 bg-[#FAF8F4] px-8 text-center portrait:flex md:hidden">
      <div className="clay-blob flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-turquoise to-turquoise-dark">
        <ArrowsClockwise weight="bold" aria-hidden="true" className="size-12 text-white" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-navy">Gire o celular para jogar</h1>
        <p className="max-w-xs text-base font-medium text-muted-foreground">
          A tela dos jogos fica melhor de lado.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded-full border border-navy/10 bg-white px-6 py-2.5 text-sm font-bold text-turquoise-dark shadow-clay-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        Continuar mesmo assim
      </button>
    </div>
  )
}
