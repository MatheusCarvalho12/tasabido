/**
 * Tela do jogo de traçado do nome da criança (Tickets A3 & A5).
 * Rota: /jogar/escreva-seu-nome
 *
 * Fluxo de integração autoritativa A5:
 * - start: POST /api/tracing-runs/start obtém ID da partida, sequência de glifos, parâmetros efetivos e geometria exata do backend.
 * - gameplay: Motor de traçado executa com a geometria do servidor e tolerância oficial.
 * - finalize: POST /api/tracing-runs/{run_id}/finalize envia evidência v1 com chave estável de idempotência.
 * - retry: Suporte a retentativas com a mesma chave em caso de erro transitório.
 */

import {
  ArrowCounterClockwise,
  ArrowLeft,
  CheckCircle,
  Play,
  Sparkle,
  Star,
  WarningCircle,
} from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import logo from '@/assets/logo.png'
import mascote from '@/assets/mascote.png'
import { RotateHint } from '@/components/jogos/RotateHint'
import { TracingCanvas, TracingFeedbackBar, TracingGlyphStrip } from '@/components/tracing'
import { ApiRequestError } from '@/lib/api'
import { fetchChildrenApi, fetchPublicGamesApi } from '@/lib/games'
import { lockLandscape, unlockOrientation } from '@/lib/orientation'
import { finalizeTracingRunApi, startTracingRunApi } from '@/lib/tracing/adapter'
import { TracingEngine } from '@/lib/tracing/engine'
import {
  createGlyphGeometryFromServer,
  getGlyphGeometry,
  normalizeChildFirstName,
  validateGlyphSequence,
} from '@/lib/tracing/geometry'
import {
  type BackendTracingRunOut,
  type GlyphGeometry,
  type TracingEvidenceV1,
  type TracingMode,
  type TracingNormalizedEvent,
  type TracingScore,
  type TracingState,
  transformFrontendEvidencesToBackend,
} from '@/lib/tracing/types'

export type FlowScreenState =
  | 'loading'
  | 'error'
  | 'intro'
  | 'starting'
  | 'gameplay'
  | 'transition'
  | 'finalizing'
  | 'completion'

function generateIdempotencyKey(runId: number): string {
  return `fin_${runId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function TracingGamePage() {
  const navigate = useNavigate()
  const { slug } = useParams({ from: '/jogar/$slug' })

  // Lock horizontal do modo criança (landscape)
  useEffect(() => {
    void lockLandscape()
    return () => unlockOrientation()
  }, [])

  // Carrega dados da criança e dos jogos
  const childrenQuery = useQuery({
    queryKey: ['children'],
    queryFn: fetchChildrenApi,
    retry: false,
  })

  const gamesQuery = useQuery({
    queryKey: ['games', 'public'],
    queryFn: fetchPublicGamesApi,
    retry: false,
  })

  const child = childrenQuery.data?.items[0] ?? null
  const glyphChars = useMemo(() => {
    return child?.name ? normalizeChildFirstName(child.name) : []
  }, [child?.name])

  const childDisplayName = useMemo(() => {
    return child?.name ? child.name.trim().split(/\s+/)[0] : ''
  }, [child?.name])

  const matchedGame = useMemo(() => {
    return gamesQuery.data?.items.find((g) => g.slug === slug) ?? null
  }, [gamesQuery.data, slug])

  // Estados do fluxo
  const [screenState, setScreenState] = useState<FlowScreenState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [currentGlyphIndex, setCurrentGlyphIndex] = useState<number>(0)
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
  const [showAbandonModal, setShowAbandonModal] = useState<boolean>(false)

  // Estado da partida autoritativa iniciada no backend (Ticket A5)
  const [serverGeometries, setServerGeometries] = useState<Record<string, GlyphGeometry>>({})
  const [effectiveGlyphSequence, setEffectiveGlyphSequence] = useState<string[]>([])

  const authoritativeRunRef = useRef<BackendTracingRunOut | null>(null)
  const idempotencyKeyRef = useRef<string>('')
  const completedEvidencesRef = useRef<TracingEvidenceV1[]>([])
  const allEventsRef = useRef<TracingNormalizedEvent[]>([])
  const engineRef = useRef<TracingEngine | null>(null)

  // Estado interno do motor atual
  const [engineState, setEngineState] = useState<TracingState>('ready')
  const [engineScore, setEngineScore] = useState<TracingScore>({
    coverage: 0,
    precision: 1,
    engagement: 0,
    overall: 0,
  })

  // Sincroniza e valida estado inicial com base nas queries
  useEffect(() => {
    if (childrenQuery.isLoading || gamesQuery.isLoading) {
      setScreenState('loading')
      return
    }

    if (childrenQuery.isError || gamesQuery.isError) {
      setErrorMessage('Não foi possível carregar a brincadeira.')
      setScreenState('error')
      return
    }

    if (!child?.name?.trim()) {
      setErrorMessage('Nenhuma criança encontrada para a família atual.')
      setScreenState('error')
      return
    }

    if (glyphChars.length === 0) {
      setErrorMessage('O nome da criança está vazio ou inválido.')
      setScreenState('error')
      return
    }

    // Validação estrita inicial
    const validation = validateGlyphSequence(glyphChars)
    if (!validation.isValid) {
      setErrorMessage(
        `O nome contém caracteres não suportados para traçado: ${validation.unsupported.join(', ')}`,
      )
      setScreenState('error')
      return
    }

    if (!matchedGame && slug !== 'escreva-seu-nome') {
      setErrorMessage('Jogo não encontrado ou indisponível.')
      setScreenState('error')
      return
    }

    setScreenState((prev) => (prev === 'loading' ? 'intro' : prev))
  }, [
    childrenQuery.isLoading,
    gamesQuery.isLoading,
    childrenQuery.isError,
    gamesQuery.isError,
    child,
    glyphChars,
    matchedGame,
    slug,
  ])

  const currentGlyphChar =
    effectiveGlyphSequence[currentGlyphIndex] ?? glyphChars[currentGlyphIndex]

  const currentGlyphGeom: GlyphGeometry | null = useMemo(() => {
    if (!currentGlyphChar) return null
    if (serverGeometries[currentGlyphChar]) {
      return serverGeometries[currentGlyphChar]
    }
    try {
      return getGlyphGeometry(currentGlyphChar)
    } catch {
      return null
    }
  }, [currentGlyphChar, serverGeometries])

  const activeSequence = effectiveGlyphSequence.length > 0 ? effectiveGlyphSequence : glyphChars

  // Dispara início autoritativo da partida
  const handleStartAuthoritativeRun = async () => {
    if (!child?.id) {
      setErrorMessage('Criança não identificada.')
      setScreenState('error')
      return
    }

    setScreenState('starting')
    setErrorMessage('')

    try {
      const run = await startTracingRunApi({
        child_id: child.id,
      })

      authoritativeRunRef.current = run
      idempotencyKeyRef.current = generateIdempotencyKey(run.id)
      completedEvidencesRef.current = []
      allEventsRef.current = []
      setCurrentGlyphIndex(0)
      setCompletedIndices(new Set())

      // Constrói geometrias a partir do conjunto retornado pelo servidor
      const sequence = run.glyph_sequence || glyphChars
      setEffectiveGlyphSequence(sequence)

      const geomMap: Record<string, GlyphGeometry> = {}
      if (run.glyph_set?.geometry) {
        for (const char of sequence) {
          const rawStrokes = run.glyph_set.geometry[char]
          if (rawStrokes) {
            geomMap[char] = createGlyphGeometryFromServer(
              char,
              rawStrokes,
              0.085,
              (run.threshold ?? 70) / 100,
            )
          }
        }
      }
      setServerGeometries(geomMap)

      setScreenState('gameplay')
    } catch (err) {
      const status = err instanceof ApiRequestError ? err.status : 500
      if (status === 422) {
        setErrorMessage('O nome da criança contém letras não suportadas pelo catálogo de traçado.')
      } else if (status === 409) {
        setErrorMessage('Este jogo ainda não está disponível para jogar.')
      } else {
        setErrorMessage(
          'Não foi possível iniciar a partida. Verifique sua conexão e tente novamente.',
        )
      }
      setScreenState('error')
    }
  }

  // Dispara conclusão de um glifo e finalização quando atinge o último
  const handleGlyphCompleted = useCallback(
    async (evidence: TracingEvidenceV1) => {
      completedEvidencesRef.current.push(evidence)

      const nextCompleted = new Set(completedIndices)
      nextCompleted.add(currentGlyphIndex)
      setCompletedIndices(nextCompleted)

      const totalGlyphs =
        effectiveGlyphSequence.length > 0 ? effectiveGlyphSequence.length : glyphChars.length
      const isLastGlyph = currentGlyphIndex >= totalGlyphs - 1

      if (isLastGlyph) {
        const run = authoritativeRunRef.current
        if (!run) {
          setScreenState('completion')
          return
        }

        setScreenState('finalizing')

        const backendEvidence = transformFrontendEvidencesToBackend(
          allEventsRef.current,
          completedEvidencesRef.current,
          activeSequence,
          {
            glyphSetId: run.glyph_set_id,
            glyphSetVersion: run.glyph_set_version || 'uppercase-block-v1',
            glyphSetSha256: run.glyph_set_sha256 || '',
            pauseGraceMs: run.pause_grace_ms ?? 1500,
          },
          'completed',
        )

        try {
          await finalizeTracingRunApi(run.id, {
            idempotency_key: idempotencyKeyRef.current,
            evidence: backendEvidence,
          })
          setScreenState('completion')
        } catch {
          // Erro ao finalizar: mantém a tela com opção de retentativa honesta usando a mesma chave
          setErrorMessage(
            'Não foi possível salvar o resultado no servidor. Toque para tentar novamente.',
          )
          setScreenState('error')
        }
      } else {
        // Celebração da letra e transição para o próximo glifo
        setScreenState('transition')
        setTimeout(() => {
          const nextIdx = currentGlyphIndex + 1
          setCurrentGlyphIndex(nextIdx)
          setScreenState('gameplay')
        }, 1200)
      }
    },
    [
      completedIndices,
      currentGlyphIndex,
      effectiveGlyphSequence.length,
      glyphChars.length,
      activeSequence,
    ],
  )

  // Inicializa o motor para a letra atual
  const initEngineForGlyph = useCallback(
    (glyph: GlyphGeometry, index: number) => {
      if (engineRef.current) {
        engineRef.current.destroy()
      }

      const run = authoritativeRunRef.current
      const mode: TracingMode = run?.contact_mode ?? 'timed_pause'
      const threshold = (run?.threshold ?? 70) / 100
      const graceMs = run?.pause_grace_ms ?? 1500

      const engine = new TracingEngine({
        glyph,
        glyphIndex: index,
        sessionId: String(run?.id ?? 'local'),
        mode,
        completionThreshold: threshold,
        graceDurationMs: graceMs,
        onStateChange: (newState) => {
          setEngineState(newState)
        },
        onScoreChange: (newScore) => {
          setEngineScore(newScore)
        },
        onComplete: (evidence: TracingEvidenceV1) => {
          // Coleta eventos
          allEventsRef.current.push(...evidence.events)
          void handleGlyphCompleted(evidence)
        },
        onReset: () => {
          setEngineState('reset')
        },
      })

      engineRef.current = engine
      setEngineState(engine.getState())
      setEngineScore(engine.getScore())
    },
    [handleGlyphCompleted],
  )

  // Atualiza motor quando índice do glifo muda no gameplay
  useEffect(() => {
    if (screenState === 'gameplay' && activeSequence.length > 0) {
      if (!currentGlyphGeom) {
        setErrorMessage('Letra atual não é suportada pelo motor de traçado.')
        setScreenState('error')
        return
      }
      initEngineForGlyph(currentGlyphGeom, currentGlyphIndex)
    }
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy()
      }
    }
  }, [screenState, currentGlyphGeom, currentGlyphIndex, activeSequence.length, initEngineForGlyph])

  const handleConfirmAbandon = async () => {
    setShowAbandonModal(false)

    const run = authoritativeRunRef.current
    if (run) {
      const currentPartial = engineRef.current ? engineRef.current.abandon() : null
      if (currentPartial) {
        completedEvidencesRef.current.push(currentPartial)
        allEventsRef.current.push(...currentPartial.events)
      }

      const backendEvidence = transformFrontendEvidencesToBackend(
        allEventsRef.current,
        completedEvidencesRef.current,
        activeSequence,
        {
          glyphSetId: run.glyph_set_id,
          glyphSetVersion: run.glyph_set_version || 'uppercase-block-v1',
          glyphSetSha256: run.glyph_set_sha256 || '',
          pauseGraceMs: run.pause_grace_ms ?? 1500,
        },
        'abandoned',
      )

      try {
        await finalizeTracingRunApi(run.id, {
          idempotency_key: idempotencyKeyRef.current,
          evidence: backendEvidence,
        })
      } catch {
        // Silencioso em abandono
      }
    }

    void navigate({ to: '/' })
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-cream font-sans select-none">
      <RotateHint />

      {/* Topo / Header com Mascote e Ações */}
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAbandonModal(true)}
            aria-label="Voltar para o início"
            className="flex size-11 items-center justify-center rounded-2xl bg-white border-2 border-border text-navy shadow-clay-sm transition-transform active:scale-95"
          >
            <ArrowLeft weight="bold" className="size-5" />
          </button>
          <img
            src={logo}
            alt="Tá Sabido"
            draggable={false}
            className="h-8 w-auto select-none sm:h-10"
          />
        </div>

        {/* Informações da Partida no Modo Criança (Sem números técnicos) */}
        {screenState === 'gameplay' && (
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 shadow-sm border border-border">
            <Sparkle weight="fill" className="size-4 text-yellow" />
            <span className="text-sm font-extrabold text-navy">
              Letra {currentGlyphChar} ({currentGlyphIndex + 1} de {activeSequence.length})
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {childDisplayName && (
            <span className="hidden sm:inline-block rounded-full bg-blue/10 px-3 py-1 text-xs font-black text-blue">
              {childDisplayName}
            </span>
          )}
        </div>
      </header>

      {/* Área Central Interativa */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
        {screenState === 'loading' || screenState === 'starting' || screenState === 'finalizing' ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/90 p-8 shadow-clay animate-pulse">
            <div className="size-14 rounded-full border-4 border-blue border-t-transparent animate-spin" />
            <p className="text-base font-bold text-navy">
              {screenState === 'starting'
                ? 'Preparando as letras com o Sabidinho...'
                : screenState === 'finalizing'
                  ? 'Guardando a brincadeira...'
                  : 'Carregando a brincadeira...'}
            </p>
          </div>
        ) : screenState === 'error' ? (
          <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white p-6 sm:p-8 text-center shadow-clay">
            <div className="grid size-16 place-items-center rounded-2xl bg-coral/15 text-coral shadow-inner">
              <WarningCircle weight="bold" className="size-9" />
            </div>
            <h2 className="text-xl font-black text-navy">Ops, precisamos de ajuda!</h2>
            <p className="text-sm font-medium text-kid-muted leading-relaxed">
              {errorMessage || 'Ocorreu um erro ao carregar as letras do nome.'}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => void navigate({ to: '/' })}
                className="h-11 rounded-full px-5 bg-kid-bg text-navy text-sm font-bold hover:bg-border transition-colors"
              >
                Voltar ao início
              </button>
              <button
                type="button"
                onClick={handleStartAuthoritativeRun}
                className="h-11 rounded-full px-6 bg-blue text-white text-sm font-bold shadow-clay-btn transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <ArrowCounterClockwise weight="bold" className="size-4" />
                Tentar de novo
              </button>
            </div>
          </div>
        ) : screenState === 'intro' ? (
          <div className="flex max-w-lg flex-col items-center gap-5 rounded-[2.5rem] bg-white p-6 sm:p-8 text-center shadow-clay animate-card-in">
            <img
              src={mascote}
              alt="Sabidinho"
              draggable={false}
              className="h-28 w-auto drop-shadow-md animate-bounce-gentle"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-navy">
                Vamos escrever o nome de {childDisplayName}?
              </h1>
              <p className="mt-1 text-sm font-semibold text-kid-muted">
                Siga as letrinhas na tela com o dedinho e complete seu nome!
              </p>
            </div>

            <TracingGlyphStrip
              glyphs={activeSequence}
              currentIndex={0}
              completedIndices={new Set()}
            />

            <button
              type="button"
              onClick={handleStartAuthoritativeRun}
              className="mt-2 inline-flex h-14 items-center justify-center gap-3 rounded-full bg-turquoise px-8 text-lg font-black text-white shadow-clay-btn transition-transform hover:scale-105 active:scale-95"
            >
              <Play weight="fill" className="size-6" />
              Brincar agora!
            </button>
          </div>
        ) : screenState === 'transition' ? (
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/90 p-8 shadow-clay animate-card-in">
            <div className="grid size-16 place-items-center rounded-2xl bg-yellow/20 text-yellow shadow-inner">
              <Star weight="fill" className="size-10 animate-spin-slow" />
            </div>
            <p className="text-2xl font-black text-navy">Muito bem! Que lindo!</p>
            <p className="text-sm font-bold text-turquoise">Vamos para a próxima letrinha...</p>
          </div>
        ) : screenState === 'completion' ? (
          <div className="flex max-w-md flex-col items-center gap-5 rounded-[2.5rem] bg-white p-6 sm:p-8 text-center shadow-clay animate-card-in">
            <div className="grid size-20 place-items-center rounded-full bg-turquoise/20 text-turquoise">
              <CheckCircle weight="fill" className="size-12" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-navy">
                Parabéns, você completou!
              </h2>
              <p className="mt-1 text-sm font-semibold text-kid-muted">
                Você escreveu todas as letrinhas do nome {childDisplayName}!
              </p>
            </div>

            <TracingGlyphStrip
              glyphs={activeSequence}
              currentIndex={activeSequence.length - 1}
              completedIndices={new Set(activeSequence.map((_, i) => i))}
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => void navigate({ to: '/' })}
                className="h-12 rounded-full px-6 bg-kid-bg text-navy text-sm font-bold hover:bg-border transition-colors"
              >
                Início
              </button>
              <button
                type="button"
                onClick={handleStartAuthoritativeRun}
                className="h-12 rounded-full px-7 bg-turquoise text-white text-sm font-black shadow-clay-btn transition-transform active:scale-95 flex items-center gap-2"
              >
                <ArrowCounterClockwise weight="bold" className="size-4" />
                Brincar de novo!
              </button>
            </div>
          </div>
        ) : (
          /* Modo Gameplay Ativo */
          <div className="flex size-full max-w-4xl flex-col items-center justify-between gap-2">
            <TracingGlyphStrip
              glyphs={activeSequence}
              currentIndex={currentGlyphIndex}
              completedIndices={completedIndices}
            />

            <div className="relative flex flex-1 w-full max-w-lg items-center justify-center">
              {currentGlyphGeom && engineRef.current && (
                <TracingCanvas
                  glyph={currentGlyphGeom}
                  engine={engineRef.current}
                  state={engineState}
                  score={engineScore}
                  className="size-72 sm:size-80"
                />
              )}
            </div>

            <TracingFeedbackBar
              state={engineState}
              score={engineScore}
              className="w-full max-w-md pb-2"
            />
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Abandono */}
      {showAbandonModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-card-in"
        >
          <div className="max-w-sm w-full bg-cream rounded-3xl p-6 text-center shadow-kid-modal border-2 border-kid-bg flex flex-col gap-4">
            <h3 id="abandon-title" className="text-xl font-extrabold text-navy">
              Quer sair da brincadeira?
            </h3>
            <p className="text-sm text-kid-muted font-medium">
              Se você sair agora, seu progresso nesta partida será salvo.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAbandonModal(false)}
                className="h-11 rounded-full px-5 bg-white text-navy border border-border text-sm font-bold hover:bg-kid-bg"
              >
                Continuar brincando
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmAbandon()}
                className="h-11 rounded-full px-6 bg-coral text-white text-sm font-bold shadow-clay-btn hover:bg-coral-dark"
              >
                Sair agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
