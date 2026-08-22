/**
 * Tela do jogo de traçado do nome da criança (Ticket A3).
 * Rota: /jogar/escreva-seu-nome
 *
 * Estados do fluxo infantil:
 * - loading: Carregamento dos dados da criança e do jogo.
 * - error: Falha de rede, criança ausente ou letras não suportadas (sem avançar).
 * - intro: Apresentação da brincadeira, mascote e prévia do nome.
 * - gameplay: Traçado ativo com estados do motor (ready, drawing, valid_touching, grace, reset, invalid).
 * - transition: Transição e celebração entre letras.
 * - completion: Conclusão de todas as letras do nome.
 * - abandonment: Modal de saída/abandono com persistência de evidência parcial.
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
import { fetchChildrenApi, fetchPublicGamesApi } from '@/lib/games'
import { lockLandscape, unlockOrientation } from '@/lib/orientation'
import { submitTracingSession } from '@/lib/tracing/adapter'
import { TracingEngine } from '@/lib/tracing/engine'
import {
  getGlyphGeometry,
  normalizeChildFirstName,
  validateGlyphSequence,
} from '@/lib/tracing/geometry'
import {
  CANONICAL_GLYPH_SET_HASH,
  CANONICAL_GLYPH_SET_ID,
  CANONICAL_GLYPH_SET_VERSION,
  type GlyphGeometry,
  type TracingEvidenceV1,
  type TracingMode,
  type TracingScore,
  type TracingSessionEvidenceV1,
  type TracingState,
} from '@/lib/tracing/types'

export type FlowScreenState =
  | 'loading'
  | 'error'
  | 'intro'
  | 'gameplay'
  | 'transition'
  | 'completion'

function generateRunSessionId(): string {
  return `trace_run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
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
  const [tracingMode] = useState<TracingMode>('timed_pause')

  // Run/Session ID consistente para toda a partida (não muda a cada glifo)
  const runSessionIdRef = useRef<string>(generateRunSessionId())
  const completedEvidencesRef = useRef<TracingEvidenceV1[]>([])
  const engineRef = useRef<TracingEngine | null>(null)
  const sessionStartTimeRef = useRef<number>(Date.now())

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

    // Validação estrita: se algum caractere do nome não for suportado, bloqueia no erro
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

  const currentGlyphChar = glyphChars[currentGlyphIndex]

  const currentGlyphGeom: GlyphGeometry | null = useMemo(() => {
    if (!currentGlyphChar) return null
    try {
      return getGlyphGeometry(currentGlyphChar)
    } catch {
      return null
    }
  }, [currentGlyphChar])

  const glyphItems = useMemo(
    () => glyphChars.map((ch, i) => ({ id: `glyph_char_${ch}_${i}`, ch, index: i })),
    [glyphChars],
  )

  // Dispara conclusão de um glifo
  const handleGlyphCompleted = useCallback(
    (evidence: TracingEvidenceV1) => {
      completedEvidencesRef.current.push(evidence)

      const nextCompleted = new Set(completedIndices)
      nextCompleted.add(currentGlyphIndex)
      setCompletedIndices(nextCompleted)

      const isLastGlyph = currentGlyphIndex >= glyphChars.length - 1

      if (isLastGlyph) {
        if (!child?.name) {
          setErrorMessage('Erro de integridade dos dados da criança.')
          setScreenState('error')
          return
        }

        // Encerrou todas as letras do nome! Serializa evidência completa da sessão usando run ID
        const sessionEvidence: TracingSessionEvidenceV1 = {
          schemaVersion: 'v1',
          scoringVersion: 'v1',
          glyphSetId: CANONICAL_GLYPH_SET_ID,
          glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
          glyphSetHash: CANONICAL_GLYPH_SET_HASH,
          sessionId: runSessionIdRef.current,
          childName: child.name,
          mode: tracingMode,
          status: 'completed',
          startedAt: new Date(sessionStartTimeRef.current).toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - sessionStartTimeRef.current,
          glyphs: completedEvidencesRef.current,
        }
        void submitTracingSession(sessionEvidence)

        setTimeout(() => {
          setScreenState('completion')
        }, 600)
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
    [completedIndices, currentGlyphIndex, glyphChars.length, child?.name, tracingMode],
  )

  // Inicializa o motor para a letra atual
  const initEngineForGlyph = useCallback(
    (glyph: GlyphGeometry, index: number) => {
      if (engineRef.current) {
        engineRef.current.destroy()
      }

      const engine = new TracingEngine({
        glyph,
        glyphIndex: index,
        sessionId: runSessionIdRef.current,
        mode: tracingMode,
        completionThreshold: 0.7,
        graceDurationMs: 1500,
        onStateChange: (newState) => {
          setEngineState(newState)
        },
        onScoreChange: (newScore) => {
          setEngineScore(newScore)
        },
        onComplete: (evidence: TracingEvidenceV1) => {
          handleGlyphCompleted(evidence)
        },
        onReset: () => {
          setEngineState('reset')
        },
      })

      engineRef.current = engine
      setEngineState(engine.getState())
      setEngineScore(engine.getScore())
    },
    [tracingMode, handleGlyphCompleted],
  )

  // Atualiza motor quando índice do glifo muda no gameplay
  useEffect(() => {
    if (screenState === 'gameplay' && glyphChars.length > 0) {
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
  }, [screenState, currentGlyphGeom, currentGlyphIndex, glyphChars.length, initEngineForGlyph])

  const handleStartGame = () => {
    runSessionIdRef.current = generateRunSessionId()
    sessionStartTimeRef.current = Date.now()
    completedEvidencesRef.current = []
    setCurrentGlyphIndex(0)
    setCompletedIndices(new Set())
    setScreenState('gameplay')
  }

  const handleRestartGame = () => {
    runSessionIdRef.current = generateRunSessionId()
    sessionStartTimeRef.current = Date.now()
    completedEvidencesRef.current = []
    setCurrentGlyphIndex(0)
    setCompletedIndices(new Set())
    setScreenState('gameplay')
  }

  const handleConfirmAbandon = () => {
    setShowAbandonModal(false)

    if (!child?.name) {
      void navigate({ to: '/' })
      return
    }

    // Serializa evidência fiel de abandono contendo glifos concluídos e parcial atual
    const currentPartial = engineRef.current ? engineRef.current.abandon() : null
    const allGlyphs = currentPartial
      ? [...completedEvidencesRef.current, currentPartial]
      : completedEvidencesRef.current

    const sessionEvidence: TracingSessionEvidenceV1 = {
      schemaVersion: 'v1',
      scoringVersion: 'v1',
      glyphSetId: CANONICAL_GLYPH_SET_ID,
      glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
      glyphSetHash: CANONICAL_GLYPH_SET_HASH,
      sessionId: runSessionIdRef.current,
      childName: child.name,
      mode: tracingMode,
      status: 'abandoned',
      startedAt: new Date(sessionStartTimeRef.current).toISOString(),
      completedAt: null,
      durationMs: Date.now() - sessionStartTimeRef.current,
      glyphs: allGlyphs,
    }

    void submitTracingSession(sessionEvidence)
    void navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-kid-bg text-navy select-none font-sans overflow-x-hidden">
      {/* Fallback de rotação quando em modo retrato */}
      <RotateHint />

      {/* Cabeçalho do jogo com logo, progresso do nome e botão sair */}
      <header className="flex items-center justify-between px-4 py-3 sm:px-6 md:px-8 bg-kid-card/70 border-b border-kid-bg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAbandonModal(true)}
            aria-label="Voltar aos jogos"
            className="flex items-center justify-center size-10 rounded-full bg-kid-card text-navy border border-border shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <ArrowLeft weight="bold" className="size-5" />
          </button>
          <img src={logo} alt="Tá Sabido" className="h-8 md:h-9" />
        </div>

        {/* Faixa de letras visível durante o gameplay e transição */}
        {(screenState === 'gameplay' || screenState === 'transition') && (
          <TracingGlyphStrip
            glyphs={glyphChars}
            currentIndex={currentGlyphIndex}
            completedIndices={completedIndices}
          />
        )}

        <div className="w-10" />
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. TELA DE CARREGAMENTO (LOADING)                             */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'loading' && (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-card-in">
          <div className="max-w-md w-full bg-kid-card rounded-3xl p-8 shadow-kid-modal border-2 border-kid-bg flex flex-col items-center gap-4">
            <img
              src={mascote}
              alt=""
              aria-hidden="true"
              className="w-28 sm:w-36 drop-shadow-lg animate-pulse motion-reduce:animate-none"
              draggable={false}
            />
            <h1 className="text-2xl font-extrabold text-navy">Carregando a brincadeira...</h1>
            <p className="text-base text-kid-muted font-bold">
              Preparando as letrinhas do seu nome com carinho!
            </p>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. TELA DE ERRO (ERROR)                                       */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'error' && (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-card-in">
          <div className="max-w-md w-full bg-kid-card rounded-3xl p-8 shadow-kid-modal border-2 border-coral flex flex-col items-center gap-4">
            <WarningCircle weight="fill" className="size-16 text-coral" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy">Ops! Algo deu errado</h1>
            <p className="text-base sm:text-lg text-kid-muted font-bold">{errorMessage}</p>

            <button
              type="button"
              onClick={() => {
                void childrenQuery.refetch()
                void gamesQuery.refetch()
              }}
              className="mt-2 w-full h-14 rounded-full bg-blue text-white text-lg font-black shadow-clay-btn flex items-center justify-center gap-2 hover:bg-blue-dark"
            >
              <ArrowCounterClockwise weight="bold" className="size-5" />
              Tentar novamente
            </button>

            <button
              type="button"
              onClick={() => void navigate({ to: '/' })}
              className="w-full h-12 rounded-full bg-kid-bg text-navy text-base font-bold hover:bg-border"
            >
              Voltar aos jogos
            </button>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TELA DE INTRODUÇÃO (INTRO)                                 */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'intro' && (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-card-in">
          <div className="max-w-md w-full bg-kid-card rounded-3xl p-6 sm:p-8 shadow-kid-modal border-2 border-kid-bg flex flex-col items-center gap-4">
            <img
              src={mascote}
              alt=""
              aria-hidden="true"
              className="w-28 sm:w-36 drop-shadow-lg"
              draggable={false}
            />

            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy leading-tight">
              Oi, {childDisplayName}!
            </h1>

            <p className="text-base sm:text-lg text-kid-muted font-bold leading-relaxed">
              Vamos aprender a traçar as letrinhas do seu nome com o Sabidinho?
            </p>

            {/* Prévia das letras do nome */}
            <div className="flex items-center justify-center gap-2 my-2 flex-wrap">
              {glyphItems.map(({ id, ch }) => (
                <span
                  key={id}
                  className="size-10 sm:size-12 rounded-2xl bg-kid-bg text-navy border-2 border-blue/20 font-black text-xl sm:text-2xl flex items-center justify-center shadow-sm"
                >
                  {ch}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartGame}
              className="mt-2 w-full h-14 sm:h-16 rounded-full bg-blue text-white text-lg sm:text-xl font-black shadow-clay-btn flex items-center justify-center gap-3 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0"
            >
              <Play weight="fill" className="size-6" />
              Começar a brincar!
            </button>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TELA DE GAMEPLAY ATIVO (READY, DRAWING, GRACE, RESET)      */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'gameplay' && engineRef.current && currentGlyphGeom && (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-2 gap-3 max-w-4xl mx-auto w-full">
          {/* Canvas SVG central com captura transparente e traço fiel em preto no branco */}
          <TracingCanvas
            engine={engineRef.current}
            glyph={currentGlyphGeom}
            state={engineState}
            score={engineScore}
            onStateUpdate={() => {
              if (engineRef.current) {
                setEngineState(engineRef.current.getState())
                setEngineScore(engineRef.current.getScore())
              }
            }}
          />

          {/* Barra de feedback qualitativo em pt-BR (NUNCA pontuação numérica) */}
          <TracingFeedbackBar state={engineState} score={engineScore} className="mt-1" />
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TELA DE TRANSIÇÃO ENTRE LETRAS (TRANSITION)               */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'transition' && (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-card-in">
          <div className="max-w-sm w-full bg-kid-card rounded-3xl p-6 sm:p-8 shadow-kid-modal border-2 border-kid-star flex flex-col items-center gap-3">
            <div className="size-20 rounded-full bg-kid-star/20 text-kid-star flex items-center justify-center animate-bounce motion-reduce:animate-none">
              <Star weight="fill" className="size-12" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy">
              Letra {currentGlyphChar} concluída!
            </h2>

            <p className="text-base sm:text-lg text-kid-muted font-bold">
              Que lindo! Vamos para a próxima letrinha...
            </p>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TELA DE CONCLUSÃO DO NOME COMPLETO (COMPLETION)            */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'completion' && (
        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-card-in">
          <div className="max-w-md w-full bg-kid-card rounded-3xl p-6 sm:p-8 shadow-kid-modal border-4 border-kid-star flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={mascote}
                alt=""
                aria-hidden="true"
                className="w-32 sm:w-40 drop-shadow-xl animate-bounce motion-reduce:animate-none"
                draggable={false}
              />
              <span className="absolute -top-2 -right-2 bg-kid-star text-navy size-10 rounded-full flex items-center justify-center shadow-md">
                <Sparkle weight="fill" className="size-6" />
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-navy leading-tight">
              Parabéns, {childDisplayName}!
            </h1>

            <p className="text-lg text-kid-muted font-bold">
              Você completou todas as letras do seu nome com muito capricho!
            </p>

            {/* Nome completo destacado com estrelas */}
            <div className="flex items-center justify-center gap-2 my-2 flex-wrap bg-kid-bg/60 p-3 rounded-2xl border border-kid-star/40">
              {glyphItems.map(({ id, ch }) => (
                <div
                  key={id}
                  className="relative size-12 rounded-2xl bg-kid-star text-navy font-black text-2xl flex items-center justify-center shadow-md"
                >
                  {ch}
                  <CheckCircle
                    weight="fill"
                    className="absolute -top-1.5 -right-1.5 size-4 text-kid-turquoise bg-white rounded-full"
                  />
                </div>
              ))}
            </div>

            {/* Ação primária: Jogar de novo */}
            <button
              type="button"
              onClick={handleRestartGame}
              className="mt-2 w-full h-14 rounded-full bg-blue text-white text-lg font-black shadow-clay-btn flex items-center justify-center gap-3 transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0"
            >
              <ArrowCounterClockwise weight="bold" className="size-6" />
              Jogar de novo
            </button>

            {/* Ação secundária: Voltar aos jogos */}
            <button
              type="button"
              onClick={() => void navigate({ to: '/' })}
              className="w-full h-12 rounded-full bg-kid-bg text-navy text-base font-bold transition-colors hover:bg-border"
            >
              Voltar aos jogos
            </button>
          </div>
        </main>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. MODAL DE ABANDONO / CONFIRMAÇÃO DE SAÍDA                   */}
      {/* ------------------------------------------------------------- */}
      {showAbandonModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="abandon-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-card-in"
        >
          <div className="max-w-sm w-full bg-kid-card rounded-3xl p-6 sm:p-8 shadow-kid-modal border-2 border-kid-bg flex flex-col items-center text-center gap-4">
            <WarningCircle weight="fill" className="size-14 text-coral" />

            <h2 id="abandon-title" className="text-2xl font-extrabold text-navy">
              Quer sair do jogo?
            </h2>

            <p className="text-base text-kid-muted font-bold leading-relaxed">
              Você poderá jogar de novo quando quiser.
            </p>

            <button
              type="button"
              onClick={() => setShowAbandonModal(false)}
              className="w-full h-14 rounded-full bg-blue text-white text-lg font-black shadow-clay-btn flex items-center justify-center transition-colors hover:bg-blue-dark"
            >
              Continuar jogando
            </button>

            <button
              type="button"
              onClick={handleConfirmAbandon}
              className="w-full h-12 rounded-full bg-kid-bg text-navy text-base font-bold hover:bg-border"
            >
              Sair para os jogos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
