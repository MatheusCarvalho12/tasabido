import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import mascote from '@/assets/mascote.png'
import type { CardOrigin } from '@/components/jogos/GameCard'
import { GameCarousel } from '@/components/jogos/GameCarousel'
import { GamePreviewModal } from '@/components/jogos/GamePreviewModal'
import { GamesHeader } from '@/components/jogos/GamesHeader'
import { RotateHint } from '@/components/jogos/RotateHint'
import { ApiRequestError, fetchMeApi } from '@/lib/api'
import { clearAuth, getToken } from '@/lib/auth'
import { fetchAssignmentsApi, fetchChildrenApi, fetchPublicGamesApi } from '@/lib/games'
import type { Game } from '@/types/game'

/**
 * Home do modo criança (pós-login da família): full-bleed, saudação com o nome
 * da criança e 3 carrosséis infinitos com dados 100% da API (contrato T2/T3).
 * Zero mock — estados de carregamento/erro/vazio são honestos.
 */
export function JogosPage() {
  const navigate = useNavigate()
  const [previewGame, setPreviewGame] = useState<Game | null>(null)
  const [previewOrigin, setPreviewOrigin] = useState<CardOrigin | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMeApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  const childrenQuery = useQuery({
    queryKey: ['children'],
    queryFn: fetchChildrenApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  const child = childrenQuery.data?.items[0] ?? null

  const publicGamesQuery = useQuery({
    queryKey: ['games', 'public'],
    queryFn: fetchPublicGamesApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', child?.id],
    queryFn: async () => {
      if (!child) {
        throw new Error('Criança não encontrada')
      }
      return fetchAssignmentsApi(child.id)
    },
    enabled: Boolean(child),
    retry: false,
  })

  useEffect(() => {
    if (meQuery.error instanceof ApiRequestError && meQuery.error.status === 401) {
      clearAuth()
      void navigate({ to: '/login' })
    }
  }, [meQuery.error, navigate])

  const childName = childrenQuery.data?.items[0]?.name
  const publicGames = publicGamesQuery.data?.items
  const assignments = assignmentsQuery.data?.items

  const openPreview = (game: Game, origin: CardOrigin) => {
    setPreviewGame(game)
    setPreviewOrigin(origin)
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#FAF8F4] text-navy">
      {/* Decoração clay sutil (turquesa/coral), puramente decorativa */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="clay-blob absolute -right-24 top-40 size-72 rotate-12 rounded-[48%_52%_55%_45%/52%_46%_54%_48%] bg-gradient-to-br from-turquoise to-turquoise-dark opacity-15" />
        <div className="clay-blob absolute -left-20 bottom-10 size-64 -rotate-6 rounded-[55%_45%_48%_52%/46%_56%_44%_54%] bg-gradient-to-br from-coral to-coral-dark opacity-10" />
      </div>

      <RotateHint />
      <GamesHeader />

      <main className="relative z-10 flex flex-col gap-9 px-4 pb-12 pt-6 sm:px-8 lg:px-14">
        <div className="relative">
          {/* Sabidinho pequeno acenando perto do topo (decoração) */}
          <img
            src={mascote}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute -top-6 right-2 hidden h-24 w-auto drop-shadow-[0_12px_18px_rgb(33_30_26/0.22)] md:block lg:-top-8 lg:h-28"
          />

          <h1 className="text-3xl font-bold text-navy sm:text-4xl">
            {childName ? `Oi, ${childName}!` : 'Oi!'}
          </h1>
          <p className="mt-1 text-base font-medium text-muted-foreground sm:text-lg">
            O que vamos brincar hoje?
          </p>
        </div>

        <GameCarousel
          sectionId="mais-jogados"
          title="Mais jogados"
          emptyMessage="Os jogos mais queridos aparecem aqui quando tiverem partidas."
          games={publicGames}
          state={carouselState(publicGamesQuery)}
          onRetry={() => void publicGamesQuery.refetch()}
          onSelect={openPreview}
        />

        <GameCarousel
          sectionId="para-casa"
          title="Para casa"
          emptyMessage="Quando um profissional indicar um jogo, ele aparece aqui."
          games={assignments}
          state={carouselState(assignmentsQuery)}
          badge="checklist"
          onRetry={() => void assignmentsQuery.refetch()}
          onSelect={openPreview}
        />

        <GameCarousel
          sectionId="jogos-publicos"
          title="Jogos públicos"
          emptyMessage="Ainda não há jogos públicos publicados."
          games={publicGames}
          state={carouselState(publicGamesQuery)}
          onRetry={() => void publicGamesQuery.refetch()}
          onSelect={openPreview}
        />
      </main>

      {/* Sempre montado: game=null dispara a animação de saída do preview. */}
      <GamePreviewModal
        game={previewGame}
        origin={previewOrigin}
        onClose={() => {
          setPreviewGame(null)
          setPreviewOrigin(null)
        }}
      />
    </div>
  )
}

function carouselState(query: {
  isPending: boolean
  isError: boolean
}): 'loading' | 'error' | 'ready' {
  if (query.isPending) {
    return 'loading'
  }
  if (query.isError) {
    return 'error'
  }
  return 'ready'
}
