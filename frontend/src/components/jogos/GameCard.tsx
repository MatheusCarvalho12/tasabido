import { ListChecks, Star } from '@phosphor-icons/react'

import { GameThumb } from '@/components/shared/GameThumb'
import { formatCompactCount, formatPlaysLabel, formatScoreStars } from '@/lib/games'
import type { Game } from '@/types/game'

export interface CardOrigin {
  x: number
  y: number
}

export interface GameCardProps {
  game: Game
  /** Badge laranja de checklist — seção "Para casa". */
  badge?: 'checklist'
  /** Centro do card na viewport (origem da animação de crescimento do preview). */
  onSelect: (game: Game, origin: CardOrigin) => void
}

/**
 * Card de jogo do modo criança: thumbnail retangular wide (~1.8:1, ~72% da
 * altura do card — spec §2.1) com a arte do jogo sobre a cor principal da
 * paleta (cores[0]) e painel branco com título + stats reais do contrato.
 * A thumbnail vive no componente compartilhado GameThumb (thumb_url real
 * object-cover; fallback SVG/nome com onError).
 */
export function GameCard({ game, badge, onSelect }: GameCardProps) {
  const scoreLabel = formatScoreStars(game.stats.score_medio)
  const playsLabel = formatPlaysLabel(game.stats.partidas)

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        onSelect(game, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      }}
      aria-label={`${game.titulo}. Nota ${scoreLabel} de 5. ${formatCompactCount(game.stats.partidas)} jogadas${badge === 'checklist' ? '. Para casa' : ''}`}
      className="group w-44 shrink-0 overflow-hidden rounded-[20px] bg-white text-left shadow-kid-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-kid-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:w-52 lg:w-56"
    >
      <GameThumb
        game={game}
        className="aspect-[1.8/1]"
        imgClassName="transition-transform duration-200 group-hover:scale-[1.04]"
        titleClassName="text-2xl sm:text-3xl"
      >
        {badge === 'checklist' && (
          <span
            aria-hidden="true"
            className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-kid-badge-square bg-coral shadow-[0_6px_12px_-4px_rgb(246_85_45/0.6)]"
          >
            <ListChecks weight="bold" className="size-4 text-white" />
          </span>
        )}
      </GameThumb>

      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="truncate text-sm font-bold text-navy">{game.titulo}</span>
        <span className="flex items-center gap-1 text-[11px]">
          <Star weight="fill" aria-hidden="true" className="size-3.5 text-yellow" />
          <span className="font-bold text-navy">{scoreLabel}</span>
          <span className="text-muted-foreground">{playsLabel}</span>
        </span>
      </div>
    </button>
  )
}
