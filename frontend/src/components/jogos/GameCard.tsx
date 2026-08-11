import { ListChecks, Star } from '@phosphor-icons/react'
import { useState } from 'react'

import { resolveAssetUrl } from '@/lib/api'
import { formatCompactCount, formatPlaysLabel, formatScoreStars } from '@/lib/games'
import type { Game } from '@/types/game'

/** Paleta de reserva quando o jogo não tem cores no contrato. */
const FALLBACK_COLORS = ['#04a4ab', '#0d79f0', '#f6552d', '#f29e21', '#9372d5']

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
 * Card de jogo do modo criança: thumbnail quadrada com a arte do jogo sobre a
 * cor principal da paleta (cores[0]) e painel branco com título + stats reais
 * do contrato. Quando o jogo tem thumb_url própria, ela cobre a área toda
 * (object-cover); sem ela, o SVG do jogo (ou o nome em grande) sobre a cor
 * pastel. Imagem quebrada cai no mesmo fallback (onError).
 */
export function GameCard({ game, badge, onSelect }: GameCardProps) {
  const thumbnailColor = game.cores[0] ?? FALLBACK_COLORS[game.id % FALLBACK_COLORS.length]
  const thumbUrl = resolveAssetUrl(game.thumb_url)
  const svgUrl = resolveAssetUrl(game.svg_url)
  const scoreLabel = formatScoreStars(game.stats.score_medio)
  const playsLabel = formatPlaysLabel(game.stats.partidas)

  // Reset do estado de erro da thumbnail quando o jogo muda: ajustar estado
  // durante o render (padrão React) em vez de setState dentro de effect.
  const [thumbFailed, setThumbFailed] = useState(false)
  const [activeGameId, setActiveGameId] = useState<number | null>(game.id)
  if (activeGameId !== game.id) {
    setActiveGameId(game.id)
    setThumbFailed(false)
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        onSelect(game, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      }}
      aria-label={`${game.titulo}. Nota ${scoreLabel} de 5. ${formatCompactCount(game.stats.partidas)} jogadas${badge === 'checklist' ? '. Para casa' : ''}`}
      className="group w-44 shrink-0 overflow-hidden rounded-2xl bg-white text-left shadow-kid-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-kid-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:w-52 lg:w-56"
    >
      <div
        className="relative aspect-square overflow-hidden"
        style={{ backgroundColor: thumbnailColor }}
      >
        {thumbUrl && !thumbFailed ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : svgUrl ? (
          <img
            src={svgUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-3 text-center text-2xl font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)] sm:text-3xl">
            {game.titulo}
          </span>
        )}

        {badge === 'checklist' && (
          <span
            aria-hidden="true"
            className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-coral shadow-[0_6px_12px_-4px_rgb(246_85_45/0.6)]"
          >
            <ListChecks weight="bold" className="size-4 text-white" />
          </span>
        )}
      </div>

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
