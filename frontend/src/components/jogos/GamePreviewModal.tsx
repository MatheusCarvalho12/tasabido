import { ChartBarHorizontal, Clock, Play, Star, X } from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'

import mascoteUrl from '@/assets/mascote.png'
import { resolveAssetUrl } from '@/lib/api'
import { categoriaLabel, formatPartidas, formatScore, formatTempoMedio } from '@/lib/games'
import type { Game } from '@/types/games'

interface GamePreviewModalProps {
  /** Jogo em preview; `null` fecha o modal com animação de saída. */
  game: Game | null
  /** Fecha o preview (X, ESC ou clique fora). */
  onClose: () => void
  /** Ação do botão "Jogar". Default: navega para /jogar/{slug}. */
  onPlay?: (game: Game) => void
  /** Centro do card clicado em px da viewport — origem do crescimento. */
  origin?: { x: number; y: number } | null
}

/** Chip de métrica do preview (design system §2.4 — não é clicável). */
function MetricChip({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex h-16 items-center gap-3 rounded-kid-chip bg-white px-3 shadow-kid-card md:px-3.5">
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold leading-tight text-kid-muted">
          {label}
        </span>
        <span className="block truncate text-xl font-extrabold leading-tight text-kid-heading">
          {value}
        </span>
      </span>
    </div>
  )
}

/**
 * Preview do jogo (modo criança) — design system oficial
 * (docs/design-system/modo-crianca.md §2.3/§2.4): cresce do card clicado
 * até o centro com --ease-kid-pop, backdrop borrado e escurecido, banner na
 * cor pastel do jogo, 3 MetricChips e o botãozão Jogar. Título, tutorial e
 * métricas vêm do contrato da API — zero mock.
 */
export function GamePreviewModal({ game, onClose, onPlay, origin }: GamePreviewModalProps) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const [svgFailed, setSvgFailed] = useState(false)
  const [activeGameId, setActiveGameId] = useState<number | null>(game?.id ?? null)

  // Reset do estado de erro da arte quando o jogo muda: ajustar estado durante
  // o render (padrão React) em vez de setState dentro de effect. O guard
  // compara com o MESMO valor que é setado (game?.id ?? null) — comparar com
  // game?.id puro deixaria null !== undefined para sempre com game=null
  // (loop infinito de renders no browser real com o React Compiler).
  if (activeGameId !== (game?.id ?? null)) {
    setActiveGameId(game?.id ?? null)
    setSvgFailed(false)
  }

  const svgUrl = game ? resolveAssetUrl(game.svg_url) : undefined
  // Banner na cor pastel do jogo (cores[0] do contrato; fallback kid-thumb-blue).
  const artColor = game?.cores[0] ?? '#79b9e5'

  // Deslocamento inicial relativo ao centro da tela (origem do card).
  // Calculado direto — o React Compiler memoiza quando necessário.
  const originOffset =
    !origin || typeof window === 'undefined'
      ? { x: 0, y: 0 }
      : { x: origin.x - window.innerWidth / 2, y: origin.y - window.innerHeight / 2 }

  // Abre: foca o fechar, trava o scroll, guarda o foco anterior (restaura ao fechar).
  useEffect(() => {
    if (!game) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [game])

  function handlePlay() {
    if (!game) return
    if (onPlay) {
      onPlay(game)
      return
    }
    void navigate({ to: '/jogar/$slug', params: { slug: game.slug } })
  }

  // ESC fecha; Tab fica preso dentro do diálogo (focus trap).
  function handlePanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {game && (
          <motion.div
            key={game.id}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Fundo: tela de jogos borrada (6px) e escurecida; clique fora fecha. */}
            <motion.div
              data-testid="game-preview-backdrop"
              aria-hidden="true"
              className="absolute inset-0 bg-[rgb(33_30_26/0.45)] backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
            />

            {/* Painel: nasce pequeno na posição do card e cresce até o centro. */}
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onKeyDown={handlePanelKeyDown}
              className="relative flex max-h-[92vh] w-[min(92vw,640px)] flex-col overflow-visible rounded-kid-card bg-kid-modal shadow-kid-modal ring-1 ring-black/5"
              initial={{ opacity: 0, scale: 0.9, x: originOffset.x, y: originOffset.y }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: originOffset.x,
                y: originOffset.y,
                transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
              }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Fechar: círculo 40px sobre o canto superior direito (offset 8px). */}
              <button
                ref={closeRef}
                type="button"
                aria-label="Fechar preview"
                onClick={onClose}
                className="absolute -right-2 -top-2 z-20 flex size-10 items-center justify-center rounded-full bg-kid-modal text-navy shadow-kid-arrow ring-1 ring-black/5 transition-transform hover:scale-105 active:scale-95"
              >
                <X weight="bold" className="size-[18px]" />
              </button>

              {/* Banner: ~1/3 da altura, cor pastel do jogo + arte (SVG) + textura. */}
              <div
                className="relative mx-4 mt-4 h-[clamp(8.75rem,30vh,18rem)] shrink-0 overflow-hidden rounded-3xl ring-1 ring-black/5 md:mx-5 md:mt-5"
                style={{ backgroundColor: artColor }}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgb(255 255 255 / 0.9) 1.5px, transparent 1.5px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                {svgUrl && !svgFailed ? (
                  <img
                    src={svgUrl}
                    alt=""
                    draggable={false}
                    onError={() => setSvgFailed(true)}
                    className="relative h-full w-full select-none object-contain p-3 md:p-5"
                  />
                ) : (
                  <div
                    data-testid="game-preview-fallback-art"
                    className="relative flex h-full w-full items-center justify-center px-6"
                  >
                    <span className="text-center text-2xl font-extrabold text-white drop-shadow-sm md:text-4xl">
                      {game.titulo}
                    </span>
                  </div>
                )}
              </div>

              {/* Conteúdo: título + pill de categoria, tutorial, métricas, Jogar. */}
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5 pt-4 md:gap-4 md:px-7 md:pb-7 md:pt-5">
                <header className="flex flex-wrap items-start gap-x-3 gap-y-2 pr-4 md:pr-28">
                  <h2
                    id={titleId}
                    className="text-[26px] font-extrabold leading-tight text-kid-heading md:text-[30px]"
                  >
                    {game.titulo}
                  </h2>
                  <span className="mt-1 inline-flex items-center rounded-kid-pill bg-kid-turquoise-bright px-3 py-1 text-sm font-bold text-white md:mt-2">
                    {categoriaLabel(game.categoria)}
                  </span>
                </header>

                <p className="max-w-lg text-base font-medium leading-relaxed text-kid-muted text-pretty">
                  {game.tutorial}
                </p>

                {/* 3 MetricChips reais do contrato (sem runs → 0). */}
                <div className="grid grid-cols-3 gap-2 md:max-w-[85%] md:gap-3">
                  <MetricChip
                    label="Tempo médio"
                    value={formatTempoMedio(game.stats.tempo_medio_min)}
                    icon={<Clock weight="fill" className="size-7 text-kid-turquoise" />}
                  />
                  <MetricChip
                    label="Partidas"
                    value={formatPartidas(game.stats.partidas)}
                    icon={
                      <ChartBarHorizontal weight="fill" className="size-7 text-kid-purple-strong" />
                    }
                  />
                  <MetricChip
                    label="Pontuação média"
                    value={formatScore(game.stats.score_medio)}
                    icon={<Star weight="fill" className="size-7 text-kid-star" />}
                  />
                </div>

                {/* Botãozão Jogar: clay-blue em gradiente, play branco à esquerda. */}
                <button
                  type="button"
                  onClick={handlePlay}
                  className="group relative mt-1 h-[60px] w-full shrink-0 rounded-kid-pill bg-gradient-to-b from-[#168DF7] to-[#056BD8] text-[22px] font-extrabold text-white shadow-clay-btn transition-[filter,transform,box-shadow] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 md:h-16"
                >
                  Jogar
                  <span
                    aria-hidden="true"
                    className="absolute left-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:scale-105"
                  >
                    <Play weight="fill" className="ml-0.5 size-6" />
                  </span>
                </button>
              </div>

              {/* Sabidinho torcendo, sobreposto ao canto inferior direito. */}
              <img
                src={mascoteUrl}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="pointer-events-none absolute -bottom-4 -right-3 z-10 w-40 select-none drop-shadow-xl md:-bottom-5 md:-right-4 md:w-44"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}
