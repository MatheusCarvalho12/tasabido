/**
 * Tela do jogo de traçado do nome da criança (Ticket A3).
 * Rota: /jogar/escreva-seu-nome (ou /jogar/$slug)
 *
 * Estados do fluxo infantil:
 * - intro: Apresentação da brincadeira, mascote e prévia do nome.
 * - loading: Carregamento do perfil da criança e geometrias.
 * - ready: Pronto para traçar o glifo atual.
 * - drawing: Traçado ativo na tela.
 * - valid-but-still-touching: Limiar atingido com dedo na tela.
 * - grace: Pausa temporizada.
 * - reset: Reinício da tentativa.
 * - invalid: Desvio / tentativa inválida.
 * - transition: Transição e celebração entre letras.
 * - error: Tratamento de erro com retry amigável.
 * - completion: Conclusão de todas as letras do nome.
 * - abandonment: Modal de saída/abandono seguro.
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
import { saveLocalEvidence, submitTracingRunApi } from '@/lib/tracing/adapter'
import { TracingEngine } from '@/lib/tracing/engine'
import { getGlyphGeometry, normalizeChildFirstName } from '@/lib/tracing/geometry'
import type {
  GlyphGeometry,
  TracingEvidenceV1,
  TracingMode,
  TracingScore,
  TracingState,
} from '@/lib/tracing/types'

export type FlowScreenState =
  | 'intro'
  | 'loading'
  | 'gameplay'
  | 'transition'
  | 'completion'
  | 'error'

export function TracingGamePage() {
  const navigate = useNavigate()
  const { slug } = useParams({ from: '/jogar/$slug' })

  // Lock horizontal do modo criança (landscape)
  useEffect(() => {
    void lockLandscape()
    return () => unlockOrientation()
  }, [])

  // Carrega dados da criança e do jogo
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
  const rawChildName = child?.name ?? 'Lucas'
  const glyphChars = useMemo(() => normalizeChildFirstName(rawChildName), [rawChildName])
  const childDisplayName = rawChildName.trim().split(/\s+/)[0] ?? 'Lucas'

  const matchedGame = useMemo(() => {
    return gamesQuery.data?.items.find((g) => g.slug === slug) ?? null
  }, [gamesQuery.data, slug])

  // Estados do fluxo
  const [screenState, setScreenState] = useState<FlowScreenState>('intro')
  const [currentGlyphIndex, setCurrentGlyphIndex] = useState<number>(0)
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
  const [showAbandonModal, setShowAbandonModal] = useState<boolean>(false)
  const [tracingMode] = useState<TracingMode>('timed_pause')

  // Estado interno do motor atual
  const [engineState, setEngineState] = useState<TracingState>('ready')
  const [engineScore, setEngineScore] = useState<TracingScore>({
    coverage: 0,
    precision: 1,
    engagement: 0,
    overall: 0,
  })

  const currentGlyphChar = glyphChars[currentGlyphIndex] ?? 'A'
  const currentGlyphGeom: GlyphGeometry = useMemo(() => {
    return getGlyphGeometry(currentGlyphChar)
  }, [currentGlyphChar])

  const glyphItems = useMemo(
    () => glyphChars.map((ch, i) => ({ id: `glyph_char_${ch}_${i}`, ch, index: i })),
    [glyphChars],
  )

  const engineRef = useRef<TracingEngine | null>(null)
  const sessionStartTimeRef = useRef<number>(Date.now())

  // Dispara conclusão de um glifo
  const handleGlyphCompleted = useCallback(
    (evidence: TracingEvidenceV1) => {
      const nextCompleted = new Set(completedIndices)
      nextCompleted.add(currentGlyphIndex)
      setCompletedIndices(nextCompleted)

      const isLastGlyph = currentGlyphIndex >= glyphChars.length - 1

      if (isLastGlyph) {
        // Encerrou todo o nome! Envia telemetria/run se houver jogo associado
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
        )
        if (matchedGame && child) {
          void submitTracingRunApi({
            game_id: matchedGame.id,
            child_id: child.id,
            score: Math.round(evidence.finalScore.overall * 100),
            duration_seconds: durationSec,
          })
        }

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
    [completedIndices, currentGlyphIndex, glyphChars.length, matchedGame, child],
  )

  // Inicializa o motor para a letra atual
  const initEngineForGlyph = useCallback(
    (glyph: GlyphGeometry) => {
      if (engineRef.current) {
        engineRef.current.destroy()
      }

      const engine = new TracingEngine({
        glyph,
        mode: tracingMode,
        completionThreshold: glyph.completionThreshold ?? 0.75,
        graceDurationMs: 1500,
        onStateChange: (newState) => {
          setEngineState(newState)
        },
        onScoreChange: (newScore) => {
          setEngineScore(newScore)
        },
        onComplete: (evidence: TracingEvidenceV1) => {
          saveLocalEvidence(evidence)
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
    if (screenState === 'gameplay') {
      initEngineForGlyph(currentGlyphGeom)
    }
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy()
      }
    }
  }, [screenState, currentGlyphGeom, initEngineForGlyph])

  const handleStartGame = () => {
    sessionStartTimeRef.current = Date.now()
    setCurrentGlyphIndex(0)
    setCompletedIndices(new Set())
    setScreenState('gameplay')
  }

  const handleRestartGame = () => {
    sessionStartTimeRef.current = Date.now()
    setCurrentGlyphIndex(0)
    setCompletedIndices(new Set())
    setScreenState('gameplay')
  }

  const handleAbandonExit = () => {
    setShowAbandonModal(false)
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
      {/* 1. TELA DE INTRODUÇÃO (INTRO)                                 */}
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
      {/* 2. TELA DE GAMEPLAY ATIVO (READY, DRAWING, GRACE, RESET)      */}
      {/* ------------------------------------------------------------- */}
      {screenState === 'gameplay' && engineRef.current && (
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-2 gap-3 max-w-4xl mx-auto w-full">
          {/* Canvas SVG central com captura transparente e traço fiel */}
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
      {/* 3. TELA DE TRANSIÇÃO ENTRE LETRAS (TRANSITION)               */}
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
      {/* 4. TELA DE CONCLUSÃO DO NOME COMPLETO (COMPLETION)            */}
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
      {/* 5. MODAL DE ABANDONO / CONFIRMAÇÃO DE SAÍDA                   */}
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
              Você pode continuar a desenhar seu nome a qualquer momento!
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
              onClick={handleAbandonExit}
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
