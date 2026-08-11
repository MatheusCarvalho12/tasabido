import { ArrowLeft } from '@phosphor-icons/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import logo from '@/assets/logo.png'
import { ProfessionalBadge } from '@/components/auth/ProfessionalBadge'
import { GameForm } from '@/components/profissional/GameForm'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError, fetchMeApi } from '@/lib/api'
import { clearAuth, getToken } from '@/lib/auth'
import {
  createGameApi,
  fetchMyGamesApi,
  type GameFilesPayload,
  type GameFormValues,
  publishGameApi,
  updateGameApi,
  uploadGameImagesApi,
  uploadGameSvgApi,
} from '@/lib/games'
import type { Game } from '@/types/game'

/**
 * Formulário criar/editar jogo do profissional (rotas /profissional/novo e
 * /profissional/editar/:id). Fluxo real: salva o jogo (POST/PATCH), sobe os
 * arquivos escolhidos (SVG/thumb/banner) e publica quando pedido (POST
 * /publish). Zero mock — erros da API aparecem humanizados no form.
 */
export function GameFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams({ strict: false })
  const gameId = params.gameId ? Number(params.gameId) : null
  const editing = gameId !== null && Number.isFinite(gameId)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMeApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  const gamesQuery = useQuery({
    queryKey: ['games', 'mine'],
    queryFn: fetchMyGamesApi,
    enabled: Boolean(getToken()) && editing,
    retry: false,
  })

  useEffect(() => {
    if (meQuery.error instanceof ApiRequestError && meQuery.error.status === 401) {
      clearAuth()
      void navigate({ to: '/login' })
    }
  }, [meQuery.error, navigate])

  const game: Game | undefined = gamesQuery.data?.items.find((item) => item.id === gameId)
  const gameNotFound = editing && !gamesQuery.isPending && !gamesQuery.isError && !game

  const handleSubmit = async (
    values: GameFormValues,
    files: GameFilesPayload,
    publish: boolean,
  ) => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const saved =
        editing && game ? await updateGameApi(game.id, values) : await createGameApi(values)
      if (files.svg) {
        await uploadGameSvgApi(saved.id, files.svg)
      }
      if (files.thumb || files.banner) {
        await uploadGameImagesApi(saved.id, files.thumb, files.banner)
      }
      if (publish && saved.status !== 'published') {
        await publishGameApi(saved.id)
      }
      await queryClient.invalidateQueries({ queryKey: ['games'] })
      void navigate({ to: '/profissional' })
    } catch (error) {
      setSubmitError(
        error instanceof ApiRequestError
          ? error.message
          : 'Não conseguimos salvar o jogo. Tenta de novo em instantes.',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream text-navy">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="clay-blob absolute -right-24 top-32 size-72 rotate-12 rounded-[48%_52%_55%_45%/52%_46%_54%_48%] bg-gradient-to-br from-turquoise to-turquoise-dark opacity-15" />
        <div className="clay-blob absolute -left-20 bottom-16 size-64 -rotate-6 rounded-[55%_45%_48%_52%/46%_56%_44%_54%] bg-gradient-to-br from-purple to-purple-dark opacity-10" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-14">
        <img
          src={logo}
          alt="Tá Sabido"
          draggable={false}
          className="h-10 w-auto select-none sm:h-12"
        />
        <span className="hidden md:block">
          <ProfessionalBadge />
        </span>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-8">
        <div className="rounded-[2.5rem] bg-panel p-5 shadow-clay sm:p-8 lg:p-10">
          <button
            type="button"
            onClick={() => void navigate({ to: '/profissional' })}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-turquoise-dark transition-colors hover:bg-turquoise/10"
          >
            <ArrowLeft weight="bold" aria-hidden="true" className="size-4" />
            Voltar para meus jogos
          </button>

          <h1 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
            {editing ? 'Editar jogo' : 'Criar jogo'}
          </h1>
          <p className="mt-1 text-base font-medium text-muted-foreground sm:text-lg">
            {editing
              ? 'Ajusta os detalhes e salva — o jogo continua do jeito que estava até você salvar.'
              : 'Preenche os dados do jogo e salva como rascunho ou publica direto.'}
          </p>

          <div className="mt-8">
            {gameNotFound ? (
              <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-10 text-center shadow-kid-card">
                <p className="text-lg font-bold text-navy">Não achamos esse jogo.</p>
                <p className="text-sm font-medium text-muted-foreground">
                  Ele pode ter sido removido por outro profissional.
                </p>
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/profissional' })}
                  className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-blue px-6 text-sm font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Voltar para meus jogos
                </button>
              </div>
            ) : gamesQuery.isPending && editing ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-14 w-full rounded-full" />
                <Skeleton className="h-14 w-full rounded-full" />
                <Skeleton className="h-28 w-full rounded-3xl" />
                <Skeleton className="h-28 w-full rounded-3xl" />
                <Skeleton className="h-12 w-full rounded-full" />
              </div>
            ) : (
              <GameForm
                key={game?.id ?? 'novo'}
                game={editing ? game : null}
                submitting={submitting}
                submitError={submitError}
                onSubmit={handleSubmit}
                onCancel={() => void navigate({ to: '/profissional' })}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
