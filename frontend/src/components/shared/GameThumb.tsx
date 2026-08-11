import { type ReactNode, useState } from 'react'

import { resolveAssetUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Game } from '@/types/game'

/** Paleta de reserva quando o jogo não tem cores no contrato. */
export const FALLBACK_COLORS = ['#04a4ab', '#0d79f0', '#f6552d', '#f29e21', '#9372d5']

export interface GameThumbProps {
  game: Game
  /** Classes do container (aspect, tamanho, raio). */
  className?: string
  /** Classes extras dos <img> (ex.: hover scale do card). */
  imgClassName?: string
  /** Classes do <img> do fallback SVG (ex.: padding menor no card de gestão). */
  svgClassName?: string
  /** Classes do fallback de título (quando o jogo não tem arte). */
  titleClassName?: string
  /** Decorações absolutas dentro da thumbnail (ex.: badge de tarefa). */
  children?: ReactNode
}

/**
 * Thumbnail de jogo compartilhada (GameCard do modo criança e GameManagementCard
 * do profissional): thumb_url real cobre a área (object-cover); sem ela, o SVG
 * do jogo (object-contain sobre a cor pastel); sem arte, o nome em destaque.
 * Imagem quebrada cai no mesmo fallback (onError) e o estado reseta quando o
 * jogo muda.
 */
export function GameThumb({
  game,
  className,
  imgClassName,
  svgClassName,
  titleClassName,
  children,
}: GameThumbProps) {
  const thumbnailColor = game.cores[0] ?? FALLBACK_COLORS[game.id % FALLBACK_COLORS.length]
  const thumbUrl = resolveAssetUrl(game.thumb_url)
  const svgUrl = resolveAssetUrl(game.svg_url)

  // Reset do estado de erro da thumbnail quando o jogo muda: ajustar estado
  // durante o render (padrão React) em vez de setState dentro de effect.
  const [thumbFailed, setThumbFailed] = useState(false)
  const [activeGameId, setActiveGameId] = useState<number | null>(game.id)
  if (activeGameId !== game.id) {
    setActiveGameId(game.id)
    setThumbFailed(false)
  }

  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', className)}
      style={{ backgroundColor: thumbnailColor }}
    >
      {thumbUrl && !thumbFailed ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          draggable={false}
          onError={() => setThumbFailed(true)}
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : svgUrl ? (
        <img
          src={svgUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className={cn('h-full w-full object-contain p-3', svgClassName, imgClassName)}
        />
      ) : (
        <span
          className={cn(
            'px-3 text-center font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)]',
            titleClassName,
          )}
        >
          {game.titulo}
        </span>
      )}
      {children}
    </div>
  )
}
