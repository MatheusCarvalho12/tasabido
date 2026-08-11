import { EyeSlash, PaperPlaneTilt, PencilSimple } from '@phosphor-icons/react'

import { resolveAssetUrl } from '@/lib/api'
import { categoriaLabel } from '@/lib/games'
import type { Game } from '@/types/game'

/** Paleta de reserva quando o jogo não tem cores no contrato (mesma do GameCard). */
const FALLBACK_COLORS = ['#04a4ab', '#0d79f0', '#f6552d', '#f29e21', '#9372d5']

export interface GameManagementCardProps {
  game: Game
  /** Abre o formulário de edição do jogo. */
  onEdit: (game: Game) => void
  /** Publica (draft → published) ou despublica (published → draft). */
  onToggleStatus: (game: Game) => void
  /** Flag de requisição em andamento (desabilita os botões). */
  busy?: boolean
}

/**
 * Card de gestão do profissional (referência home-profissional-biblioteca):
 * thumbnail real (thumb_url; fallback: SVG sobre cores[0]; sem arte: título
 * em destaque), título, stats reais do contrato, pill de status
 * (Publicado turquesa / Rascunho amarelo) e ações Editar + Publicar/Despublicar.
 */
export function GameManagementCard({
  game,
  onEdit,
  onToggleStatus,
  busy,
}: GameManagementCardProps) {
  const thumbnailColor = game.cores[0] ?? FALLBACK_COLORS[game.id % FALLBACK_COLORS.length]
  const thumbUrl = resolveAssetUrl(game.thumb_url)
  const svgUrl = resolveAssetUrl(game.svg_url)
  const published = game.status === 'published'

  return (
    <article className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-kid-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-kid-card-hover">
      <div
        className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-28"
        style={{ backgroundColor: thumbnailColor }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : svgUrl ? (
          <img
            src={svgUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full object-contain p-2.5"
          />
        ) : (
          <span className="px-2 text-center text-sm font-bold leading-tight text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)]">
            {game.titulo}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-lg font-bold text-navy">{game.titulo}</h3>
          <span
            className={
              published
                ? 'shrink-0 rounded-full bg-turquoise px-3 py-1 text-xs font-bold text-white shadow-[0_6px_12px_-6px_rgb(4_164_171/0.7)]'
                : 'shrink-0 rounded-full bg-yellow px-3 py-1 text-xs font-bold text-navy shadow-[0_6px_12px_-6px_rgb(242_158_33/0.7)]'
            }
          >
            {published ? 'Publicado' : 'Rascunho'}
          </span>
        </div>

        <p className="truncate text-xs font-semibold text-muted-foreground">
          {categoriaLabel(game.categoria)}
        </p>

        <dl className="flex flex-col gap-0.5 text-[13px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="text-navy/70">Vezes jogado:</dt>
            <dd className="font-bold text-navy">{game.stats.partidas}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-navy/70">Pontuação média:</dt>
            <dd className="font-bold text-navy">{game.stats.score_medio}%</dd>
          </div>
        </dl>

        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(game)}
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-blue px-4 text-sm font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 sm:flex-none sm:px-6"
          >
            <PencilSimple weight="bold" aria-hidden="true" className="size-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus(game)}
            disabled={busy}
            className={
              published
                ? 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 text-xs font-bold text-muted-foreground transition-[transform,box-shadow] hover:-translate-y-0.5 hover:text-navy active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 sm:px-4 sm:text-sm'
                : 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-turquoise px-3 text-xs font-bold text-white shadow-[0_10px_20px_-10px_rgb(4_164_171/0.8)] transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 sm:px-4 sm:text-sm'
            }
          >
            {published ? (
              <>
                <EyeSlash weight="bold" aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Despublicar</span>
                <span className="sm:hidden">Tirar do ar</span>
              </>
            ) : (
              <>
                <PaperPlaneTilt weight="bold" aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Publicar</span>
                <span className="sm:hidden">Publicar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
