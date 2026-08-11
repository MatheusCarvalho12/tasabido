import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'

import { type CardOrigin, GameCard } from '@/components/jogos/GameCard'
import { Skeleton } from '@/components/ui/skeleton'
import { loopJump } from '@/lib/carousel'
import type { Game } from '@/types/games'

const GAP_PX = 16
const COPIES = 3

export type CarouselState = 'loading' | 'error' | 'ready'

export interface GameCarouselProps {
  /** Id único da seção (aria-labelledby). */
  sectionId: string
  title: string
  /** Mensagem pt-BR do estado vazio (varia por seção). */
  emptyMessage: string
  games: Game[] | undefined
  state: CarouselState
  badge?: 'checklist'
  onRetry?: () => void
  onSelect: (game: Game, origin: CardOrigin) => void
}

function smoothBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

/**
 * Carrossel horizontal infinito: o DOM repete os jogos 3x e o scroll vive na
 * cópia do meio; ao passar da borda, salta sem animação (loop perfeito, mesmo
 * com 6 jogos). Navega por setas, arrastar (mouse), teclado e scroll nativo
 * (touch).
 */
export function GameCarousel({
  sectionId,
  title,
  emptyMessage,
  games,
  state,
  badge,
  onRetry,
  onSelect,
}: GameCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [stride, setStride] = useState(0)
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{ startX: number; startScrollLeft: number } | null>(null)

  const count = games?.length ?? 0

  // Mede o passo (card + gap) e ancora o scroll no início da cópia do meio.
  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }
    const firstCard = track.querySelector<HTMLElement>('[data-carousel-card]')
    const cardWidth = firstCard?.offsetWidth ?? 0
    if (cardWidth <= 0) {
      return
    }
    const nextStride = cardWidth + GAP_PX
    setStride(nextStride)
    if (count > 0) {
      track.scrollLeft = count * nextStride
    }
    const measure = () => {
      const width = track.querySelector<HTMLElement>('[data-carousel-card]')?.offsetWidth ?? 0
      if (width > 0) {
        setStride(width + GAP_PX)
      }
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [count])

  // Loop infinito: quando o scroll sai da cópia do meio, salta de volta.
  useEffect(() => {
    const track = trackRef.current
    if (!track || stride <= 0 || count === 0) {
      return
    }
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rawIndex = Math.round(track.scrollLeft / stride)
        const jump = loopJump(rawIndex, count, COPIES)
        if (jump !== null) {
          track.scrollTo({ left: track.scrollLeft + jump * stride, behavior: 'instant' })
        }
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      track.removeEventListener('scroll', onScroll)
    }
  }, [stride, count])

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track || stride <= 0) {
      return
    }
    const pages = Math.max(1, Math.floor(track.clientWidth / stride))
    track.scrollBy({ left: direction * pages * stride, behavior: smoothBehavior() })
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') {
      return // touch/pen usam o scroll nativo (touch-pan-x)
    }
    dragRef.current = { startX: event.clientX, startScrollLeft: event.currentTarget.scrollLeft }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) {
      return
    }
    const dx = event.clientX - drag.startX
    if (Math.abs(dx) > 6) {
      suppressClickRef.current = true
    }
    event.currentTarget.scrollLeft = drag.startScrollLeft - dx
  }

  const handleSelect = (game: Game, origin: CardOrigin) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false // arrasto recente: engole o clique
      return
    }
    onSelect(game, origin)
  }

  const showChrome = stride > 0 && count > 0
  const repeated =
    games && count > 0
      ? Array.from({ length: COPIES }, (_, copy) => games.map((game) => ({ game, copy }))).flat()
      : []
  const SKELETON_KEYS = ['sk-1', 'sk-2', 'sk-3', 'sk-4']

  return (
    <section aria-labelledby={`${sectionId}-title`} className="relative">
      <h2
        id={`${sectionId}-title`}
        className="mb-3 px-4 text-lg font-semibold text-navy sm:px-0 sm:text-xl"
      >
        {title}
      </h2>

      <div className="relative">
        {showChrome && (
          <>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label={`Anterior: mais jogos de ${title}`}
              className="absolute -left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-turquoise-dark shadow-clay-white transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:-left-5 sm:size-11"
            >
              <CaretLeft weight="bold" aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label={`Próximo: mais jogos de ${title}`}
              className="absolute -right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-turquoise-dark shadow-clay-white transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue sm:-right-5 sm:size-11"
            >
              <CaretRight weight="bold" aria-hidden="true" className="size-5" />
            </button>
          </>
        )}

        <section
          ref={trackRef}
          aria-label={title}
          aria-roledescription="carrossel"
          tabIndex={showChrome ? 0 : -1}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') {
              event.preventDefault()
              scrollByPage(-1)
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault()
              scrollByPage(1)
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerLeave={() => {
            dragRef.current = null
          }}
          className="touch-pan-x select-none overflow-x-auto px-4 pb-5 pt-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-4">
            {state === 'loading' &&
              SKELETON_KEYS.map((key) => (
                <li key={key} data-carousel-card className="w-44 shrink-0 sm:w-52 lg:w-56">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="mt-2.5 h-4 w-3/4 rounded-full" />
                  <Skeleton className="mt-1.5 h-3 w-1/2 rounded-full" />
                </li>
              ))}

            {state === 'error' && (
              <li className="flex w-full flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="max-w-sm text-sm font-semibold text-navy">
                  Não conseguimos carregar os jogos.
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Confira sua conexão e tente de novo em instantes.
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-full bg-blue px-5 py-2 text-sm font-bold text-white shadow-clay-btn transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  >
                    Tentar de novo
                  </button>
                )}
              </li>
            )}

            {state === 'ready' && count === 0 && (
              <li className="flex w-full flex-col items-center gap-1 px-4 py-8 text-center">
                <p className="text-sm font-semibold text-navy">Nada por aqui ainda.</p>
                <p className="max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
              </li>
            )}

            {state === 'ready' &&
              count > 0 &&
              repeated.map(({ game, copy }) => (
                <li key={`${game.id}-${copy}`} data-carousel-card className="shrink-0">
                  <GameCard game={game} badge={badge} onSelect={handleSelect} />
                </li>
              ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
