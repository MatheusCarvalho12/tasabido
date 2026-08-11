import logo from '@/assets/logo.png'
import { PadlockButton } from '@/components/jogos/PadlockButton'

/**
 * Header fino do modo criança: logo à esquerda e cadeado turquesa discreto à
 * direita (PIN dos pais — PadlockButton da task T7). Sem sidebar, sem menu.
 */
export function GamesHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-navy/5 bg-[#FAF8F4] px-4 py-3 shadow-[0_6px_16px_-12px_rgb(33_30_26/0.3)] sm:px-8">
      <img
        src={logo}
        alt="Tá Sabido"
        draggable={false}
        className="h-10 w-auto select-none sm:h-12"
      />
      <PadlockButton />
    </header>
  )
}
