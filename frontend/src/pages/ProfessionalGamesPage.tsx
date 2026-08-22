import {
  CalendarBlank,
  CheckCircle,
  FileText,
  GridFour,
  Info,
  PencilSimple,
  Plus,
  SignOut,
  WarningCircle,
} from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import logo from '@/assets/logo.png'
import mascote from '@/assets/mascote.png'
import { ProfessionalBadge } from '@/components/auth/ProfessionalBadge'
import { ChildAssignmentOverrideModal } from '@/components/profissional/ChildAssignmentOverrideModal'
import { GameManagementCard } from '@/components/profissional/GameManagementCard'
import { TracingRunReviewView } from '@/components/tracing/TracingRunReviewView'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError, fetchMeApi } from '@/lib/api'
import { clearAuth, getToken } from '@/lib/auth'
import { fetchMyGamesApi, publishGameApi, unpublishGameApi } from '@/lib/games'
import {
  fetchChildAssignmentOverrideApi,
  fetchLinkedChildrenApi,
  fetchTracingGameConfigApi,
  fetchTracingRunReplayApi,
  fetchTracingRunsListApi,
  type LinkedChild,
  resetChildAssignmentOverrideApi,
  saveChildAssignmentOverrideApi,
} from '@/lib/tracing/adapter'
import type {
  BackendTracingRunOut,
  TracingAssignmentOverride,
  TracingGameConfig,
  TracingSessionEvidenceV1,
} from '@/lib/tracing/types'
import { cn } from '@/lib/utils'
import type { Game } from '@/types/game'

type GameFilter = 'all' | 'published' | 'draft'

const FILTROS: Array<{ value: GameFilter; label: string; icon: typeof GridFour }> = [
  { value: 'all', label: 'Todos', icon: GridFour },
  { value: 'published', label: 'Publicados', icon: FileText },
  { value: 'draft', label: 'Rascunhos', icon: PencilSimple },
]

/**
 * Gestão de jogos do profissional:
 * - Listagem e publicação de jogos (GET /api/games?scope=mine).
 * - Jornada de personalização de parâmetros de traçado por atribuição individual à criança (Tickets A4 & A5).
 * - Auditoria e revisão em-app de partidas registradas sem dados inventados de runtime.
 */
export function ProfessionalGamesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<GameFilter>('all')
  const [busyGameId, setBusyGameId] = useState<number | null>(null)

  // Estado de personalização por criança (ChildAssignmentOverrideModal)
  const [customizingGame, setCustomizingGame] = useState<Game | null>(null)
  const [customizingConfig, setCustomizingConfig] = useState<TracingGameConfig | undefined>(
    undefined,
  )
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([])
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null)
  const [existingOverride, setExistingOverride] = useState<TracingAssignmentOverride | null>(null)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false)

  // Estado de auditoria de partidas
  const [reviewedSession, setReviewedSession] = useState<
    TracingSessionEvidenceV1 | BackendTracingRunOut | null
  >(null)
  const [recentRuns, setRecentRuns] = useState<BackendTracingRunOut[]>([])

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMeApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  const gamesQuery = useQuery({
    queryKey: ['games', 'mine'],
    queryFn: fetchMyGamesApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  useEffect(() => {
    void fetchLinkedChildrenApi()
      .then((children) => {
        setLinkedChildren(children)
        if (children.length > 0) {
          setSelectedChild(children[0] ?? null)
        } else {
          setSelectedChild(null)
        }
      })
      .catch(() => {
        setLinkedChildren([])
        setSelectedChild(null)
      })

    void fetchTracingRunsListApi()
      .then((runs) => {
        setRecentRuns(runs)
      })
      .catch(() => {
        setRecentRuns([])
      })
  }, [])

  useEffect(() => {
    if (meQuery.error instanceof ApiRequestError && meQuery.error.status === 401) {
      clearAuth()
      void navigate({ to: '/login' })
    }
  }, [meQuery.error, navigate])

  const toggleStatusMutation = useMutation({
    mutationFn: async (game: Game) => {
      return game.status === 'published' ? unpublishGameApi(game.id) : publishGameApi(game.id)
    },
    onMutate: (game) => setBusyGameId(game.id),
    onSettled: () => {
      setBusyGameId(null)
      void queryClient.invalidateQueries({ queryKey: ['games', 'mine'] })
    },
  })

  const handleOpenCustomizeForChild = async (game: Game) => {
    if (linkedChildren.length === 0) {
      return
    }

    const child = selectedChild ?? linkedChildren[0]
    if (!child) {
      return
    }

    const assignment = child.assignments?.find((a) => a.game_id === game.id)
    const assignmentId = assignment?.assignment_id

    setCustomizingGame(game)
    const config = await fetchTracingGameConfigApi(game.id)
    setCustomizingConfig(config)
    setSelectedChild(child)

    const override = await fetchChildAssignmentOverrideApi(child.child_id, game.id, assignmentId)
    setExistingOverride(override)
    setIsOverrideModalOpen(true)
  }

  const handleSaveOverride = async (override: TracingAssignmentOverride) => {
    if (!selectedChild) return
    await saveChildAssignmentOverrideApi(override)
    setIsOverrideModalOpen(false)
  }

  const handleResetOverride = async () => {
    if (selectedChild && customizingGame) {
      await resetChildAssignmentOverrideApi(
        selectedChild.child_id,
        customizingGame.id,
        existingOverride?.assignmentId,
      )
    }
    setExistingOverride(null)
  }

  const handleOpenReplay = async (run: BackendTracingRunOut) => {
    try {
      const fullReplay = await fetchTracingRunReplayApi(run.id)
      setReviewedSession(fullReplay)
    } catch {
      setReviewedSession(run)
    }
  }

  const handleLogout = () => {
    clearAuth()
    void navigate({ to: '/login' })
  }

  const games = gamesQuery.data?.items ?? []
  const visibleGames = games.filter((game) => (filter === 'all' ? true : game.status === filter))
  const publishedCount = games.filter((game) => game.status === 'published').length
  const draftCount = games.length - publishedCount

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-cream text-navy font-sans">
      {/* Decoração clay sutil */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="clay-blob absolute -right-24 top-32 size-72 rotate-12 rounded-[48%_52%_55%_45%/52%_46%_54%_48%] bg-gradient-to-br from-turquoise to-turquoise-dark opacity-15" />
        <div className="clay-blob absolute -left-20 bottom-16 size-64 -rotate-6 rounded-[55%_45%_48%_52%/46%_56%_44%_54%] bg-gradient-to-br from-coral to-coral-dark opacity-10" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-14">
        <img
          src={logo}
          alt="Tá Sabido"
          draggable={false}
          className="h-10 w-auto select-none sm:h-12"
        />
        <div className="flex items-center gap-3">
          <span className="hidden md:block">
            <ProfessionalBadge />
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-navy/10 bg-white px-4 text-sm font-bold text-navy shadow-clay-sm transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
          >
            <SignOut aria-hidden="true" className="size-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-8 flex flex-col gap-8">
        {reviewedSession ? (
          <div className="rounded-[2.5rem] bg-panel p-5 shadow-clay sm:p-8">
            <TracingRunReviewView
              session={reviewedSession}
              onBack={() => setReviewedSession(null)}
            />
          </div>
        ) : (
          <>
            {/* Painel Principal de Gestão de Jogos */}
            <div className="rounded-[2.5rem] bg-panel p-5 shadow-clay sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-navy sm:text-4xl">Meus jogos</h1>
                  <p className="mt-1 text-base font-medium text-muted-foreground sm:text-lg">
                    Crie e gerencie os jogos das suas crianças
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void navigate({ to: '/profissional/novo' })}
                  className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-blue px-6 text-base font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 sm:self-auto"
                >
                  <Plus weight="bold" aria-hidden="true" className="size-5" />
                  Criar jogo
                </button>
              </div>

              {/* Informação sobre vinculação de crianças */}
              {linkedChildren.length === 0 ? (
                <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-blue/10 px-4 py-3 text-xs sm:text-sm font-medium text-navy border border-blue/20">
                  <Info weight="bold" className="size-4 text-blue shrink-0" />
                  <span>
                    Nenhuma criança vinculada para personalização individual de parâmetros.
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs font-bold text-kid-muted">
                  <span>Criança selecionada para ajustes:</span>
                  <select
                    value={selectedChild?.child_id ?? ''}
                    onChange={(e) => {
                      const found = linkedChildren.find((c) => c.child_id === e.target.value)
                      if (found) setSelectedChild(found)
                    }}
                    className="rounded-lg border border-border bg-white px-2 py-1 text-navy font-extrabold"
                  >
                    {linkedChildren.map((c) => (
                      <option key={c.child_id} value={c.child_id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                role="tablist"
                aria-label="Filtrar jogos por status"
                className="mt-6 flex flex-wrap items-center gap-2"
              >
                {FILTROS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={filter === value}
                    onClick={() => setFilter(value)}
                    className={cn(
                      'inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold transition-[box-shadow,color,transform] hover:-translate-y-0.5 active:translate-y-0 sm:px-5 sm:text-base',
                      filter === value
                        ? 'bg-white text-turquoise shadow-kid-card ring-2 ring-turquoise/25'
                        : 'bg-white/60 text-navy shadow-clay-sm hover:bg-white',
                    )}
                  >
                    <Icon weight="bold" aria-hidden="true" className="size-4.5" />
                    {label}
                    {value === 'published' && publishedCount > 0 && (
                      <span className="rounded-full bg-turquoise/10 px-2 py-0.5 text-xs font-bold text-turquoise">
                        {publishedCount}
                      </span>
                    )}
                    {value === 'draft' && draftCount > 0 && (
                      <span className="rounded-full bg-yellow/20 px-2 py-0.5 text-xs font-bold text-navy">
                        {draftCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {gamesQuery.isPending ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {[0, 1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-kid-card"
                      >
                        <Skeleton className="size-24 rounded-2xl sm:size-28" />
                        <div className="flex flex-1 flex-col gap-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-10 w-full rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : gamesQuery.isError ? (
                  <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-10 text-center shadow-kid-card">
                    <p className="text-lg font-bold text-navy">
                      Não conseguimos carregar seus jogos.
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      Confere sua conexão e tenta de novo em instantes.
                    </p>
                    <button
                      type="button"
                      onClick={() => void gamesQuery.refetch()}
                      className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-blue px-6 text-sm font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Tentar de novo
                    </button>
                  </div>
                ) : visibleGames.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-12 text-center shadow-kid-card">
                    <span className="flex size-16 items-center justify-center rounded-full bg-turquoise/10 text-turquoise">
                      <GridFour weight="bold" aria-hidden="true" className="size-8" />
                    </span>
                    <p className="text-lg font-bold text-navy">
                      {games.length === 0
                        ? 'Nenhum jogo por aqui ainda.'
                        : 'Nenhum jogo nesse filtro.'}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {games.length === 0
                        ? 'Crie o primeiro jogo das suas crianças — é rapidinho.'
                        : 'Tenta outro filtro ou cria um jogo novo.'}
                    </p>
                    {games.length === 0 && (
                      <button
                        type="button"
                        onClick={() => void navigate({ to: '/profissional/novo' })}
                        className="mt-1 inline-flex h-11 items-center gap-2 rounded-full bg-blue px-6 text-sm font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <Plus weight="bold" aria-hidden="true" className="size-4" />
                        Criar jogo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {visibleGames.map((game) => (
                      <GameManagementCard
                        key={game.id}
                        game={game}
                        busy={busyGameId === game.id}
                        onEdit={(selected) =>
                          void navigate({
                            to: '/profissional/editar/$gameId',
                            params: { gameId: String(selected.id) },
                          })
                        }
                        onCustomizeForChild={
                          linkedChildren.length > 0 ? handleOpenCustomizeForChild : undefined
                        }
                        onToggleStatus={(selected) => toggleStatusMutation.mutate(selected)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Seção de Auditoria de Partidas Recentes de Traçado */}
            <div className="rounded-[2.5rem] bg-white p-5 shadow-sm border border-kid-bg sm:p-8">
              <div className="flex items-center justify-between gap-4 border-b border-kid-bg pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-navy">
                    Auditoria de Partidas Recentes de Traçado
                  </h2>
                  <p className="text-xs sm:text-sm text-kid-muted font-medium">
                    Revisão técnica de pontuação e replay de eventos para profissionais
                  </p>
                </div>
              </div>

              {recentRuns.length === 0 ? (
                <p className="text-sm text-kid-muted py-6 text-center">
                  Nenhuma partida registrada até o momento.
                </p>
              ) : (
                <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {recentRuns.map((run) => {
                    const formattedDate = run.started_at
                      ? new Date(run.started_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Data indisponível'

                    return (
                      <div
                        key={run.id}
                        className="p-4 rounded-2xl bg-cream border border-kid-bg flex flex-col justify-between gap-3 shadow-inner"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-xs text-kid-muted font-bold">
                            <span className="flex items-center gap-1">
                              <CalendarBlank weight="bold" className="size-3" />
                              {formattedDate}
                            </span>
                            {run.status === 'completed' ? (
                              <span className="text-[10px] text-turquoise-dark font-extrabold bg-turquoise/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle weight="fill" className="size-3" /> Concluído
                              </span>
                            ) : (
                              <span className="text-[10px] text-coral-dark font-extrabold bg-coral/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <WarningCircle weight="fill" className="size-3" /> Abandonado
                              </span>
                            )}
                          </div>
                          <strong className="text-base text-navy">Partida #{run.id}</strong>
                          <span className="text-xs text-blue font-black">
                            Score geral: {run.score ?? 0}% ({run.glyph_sequence?.length ?? 0}{' '}
                            letras)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenReplay(run)}
                          className="h-9 w-full rounded-full bg-white text-navy border border-border text-xs font-bold hover:bg-blue hover:text-white transition-colors"
                        >
                          Auditar partida e replay
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal de Personalização por Criança (Integrado na Jornada do Profissional) */}
      {customizingGame && selectedChild && (
        <ChildAssignmentOverrideModal
          childId={selectedChild.child_id}
          childName={selectedChild.name}
          gameId={customizingGame.id}
          gameTitle={customizingGame.titulo}
          assignmentId={
            selectedChild.assignments?.find((a) => a.game_id === customizingGame.id)?.assignment_id
          }
          gameConfig={customizingConfig}
          existingOverride={existingOverride}
          isOpen={isOverrideModalOpen}
          onClose={() => setIsOverrideModalOpen(false)}
          onSave={handleSaveOverride}
          onReset={handleResetOverride}
        />
      )}

      {/* Sabidinho decorativo */}
      <img
        src={mascote}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute -bottom-2 right-2 z-10 hidden h-32 w-auto drop-shadow-[0_14px_20px_rgb(33_30_26/0.25)] lg:block xl:right-8"
      />
    </div>
  )
}
