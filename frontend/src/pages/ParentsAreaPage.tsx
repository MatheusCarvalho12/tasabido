import { GameController, LockKey } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'

import logo from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import { lockLandscape, unlockOrientation } from '@/lib/orientation'
import { useParentPinStore } from '@/stores/useParentPinStore'

/**
 * Área dos pais (rota /pais) — shell placeholder até a tela real sair.
 * Só acessível com PIN validado (guard na rota). "Voltar aos jogos" relocka
 * a orientação HORIZONTAL do modo criança.
 */
export function ParentsAreaPage() {
  const navigate = useNavigate()
  const lock = useParentPinStore((s) => s.lock)

  const handleBackToGames = () => {
    lock()
    unlockOrientation()
    void lockLandscape()
    void navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 text-center text-navy">
      <img src={logo} alt="Tá Sabido" draggable={false} className="h-16 w-auto sm:h-20" />
      <div className="flex flex-col items-center gap-2">
        <div className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-turquoise to-turquoise-dark shadow-clay-sm">
          <LockKey weight="fill" aria-hidden="true" className="size-8 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Área dos pais</h1>
        <p className="max-w-sm text-muted-foreground">
          Em breve, você vai encontrar aqui as configurações da família e o controle do modo
          criança.
        </p>
      </div>
      <Button
        onClick={handleBackToGames}
        className="h-12 rounded-full bg-primary px-7 text-base font-bold shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
      >
        <GameController className="size-5" aria-hidden="true" />
        Voltar aos jogos
      </Button>
    </main>
  )
}
