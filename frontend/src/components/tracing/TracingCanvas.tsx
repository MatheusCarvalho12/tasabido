/**
 * Componente principal do canvas de traçado (Ticket A2).
 * Renderiza alvo SVG e traçado fiel em preto no branco (black on white v1).
 * Captura transparente de ponteiro com touch-action: none e setPointerCapture,
 * sem suavização artificial, com cues de acessibilidade não-cor e motion reduzido.
 */

import {
  CheckCircle,
  HandTap,
  LockSimple,
  PencilSimple,
  Sparkle,
  Timer,
  WarningCircle,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TracingEngine } from '@/lib/tracing/engine'
import type { GlyphGeometry, TracingScore, TracingState, TracingStroke } from '@/lib/tracing/types'

export interface TracingCanvasProps {
  engine: TracingEngine
  glyph: GlyphGeometry
  state: TracingState
  score?: TracingScore
  onStateUpdate?: () => void
  className?: string
}

export function TracingCanvas({
  engine,
  glyph,
  state,
  onStateUpdate,
  className = '',
}: TracingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStrokePoints, setActiveStrokePoints] = useState<Array<{ x: number; y: number }>>([])
  const [completedStrokes, setCompletedStrokes] = useState<TracingStroke[]>([])

  // Sincroniza traços quando o estado muda (ex: reset ou conclusão)
  useEffect(() => {
    setCompletedStrokes(engine.getStrokes())
    if (state === 'ready' || state === 'reset') {
      setActiveStrokePoints([])
    }
  }, [engine, state])

  /** Converte coordenadas de tela (clientX, clientY) para coordenadas normalizadas [0, 1]. */
  const normalizeCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; isOutOfBounds: boolean } => {
      if (!containerRef.current) {
        return { x: 0.5, y: 0.5, isOutOfBounds: true }
      }

      const rect = containerRef.current.getBoundingClientRect()
      const rawX = (clientX - rect.left) / rect.width
      const rawY = (clientY - rect.top) / rect.height

      const isOutOfBounds = rawX < 0 || rawX > 1 || rawY < 0 || rawY > 1
      return { x: rawX, y: rawY, isOutOfBounds }
    },
    [],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Fallback caso setPointerCapture falhe no ambiente
      }

      const { x, y, isOutOfBounds } = normalizeCoords(e.clientX, e.clientY)
      const accepted = engine.handlePointerDown(x, y, e.pointerId, isOutOfBounds)
      if (accepted) {
        setActiveStrokePoints([{ x, y }])
        onStateUpdate?.()
      }
    },
    [engine, normalizeCoords, onStateUpdate],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (engine.getActivePointerId() !== e.pointerId) return

      const { x, y, isOutOfBounds } = normalizeCoords(e.clientX, e.clientY)
      const accepted = engine.handlePointerMove(x, y, e.pointerId, isOutOfBounds)
      if (accepted) {
        // Renderização fiel: adiciona ponto cru sem suavização artificial
        setActiveStrokePoints((prev) => [...prev, { x, y }])
        onStateUpdate?.()
      }
    },
    [engine, normalizeCoords, onStateUpdate],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (engine.getActivePointerId() !== e.pointerId) return

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Fallback
      }

      const { x, y, isOutOfBounds } = normalizeCoords(e.clientX, e.clientY)
      engine.handlePointerUp(x, y, e.pointerId, isOutOfBounds)
      setActiveStrokePoints([])
      setCompletedStrokes(engine.getStrokes())
      onStateUpdate?.()
    },
    [engine, normalizeCoords, onStateUpdate],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Fallback
      }
      engine.handlePointerCancel(e.pointerId)
      setActiveStrokePoints([])
      setCompletedStrokes(engine.getStrokes())
      onStateUpdate?.()
    },
    [engine, onStateUpdate],
  )

  const handleLostPointerCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      engine.handleLostPointerCapture(e.pointerId)
      setActiveStrokePoints([])
      setCompletedStrokes(engine.getStrokes())
      onStateUpdate?.()
    },
    [engine, onStateUpdate],
  )

  // Status acessível textual (não depende exclusivamente de cor)
  let statusText = 'Passe o dedo na letra para desenhar'
  let statusIcon = <HandTap className="size-5 shrink-0" weight="bold" />

  if (state === 'drawing') {
    statusText = 'Desenhando...'
    statusIcon = <PencilSimple className="size-5 shrink-0" weight="fill" />
  } else if (state === 'valid_touching') {
    statusText = 'Muito bem! Solte o dedinho para completar!'
    statusIcon = (
      <Sparkle
        className="size-5 shrink-0 animate-bounce motion-reduce:animate-none"
        weight="fill"
      />
    )
  } else if (state === 'grace') {
    statusText = 'Pausado! Continue desenhando antes do tempo acabar.'
    statusIcon = <Timer className="size-5 shrink-0" weight="bold" />
  } else if (state === 'invalid') {
    statusText = 'Você saiu da área de desenho! Volte para a letra.'
    statusIcon = <WarningCircle className="size-5 shrink-0 text-coral" weight="fill" />
  } else if (state === 'completed') {
    statusText = 'Letra concluída com sucesso!'
    statusIcon = <CheckCircle className="size-5 shrink-0" weight="fill" />
  } else if (state === 'reset') {
    statusText = 'Vamos tentar de novo com calma!'
    statusIcon = <HandTap className="size-5 shrink-0" weight="bold" />
  }

  // Contrato v1 aceito: Alvo, guia e traço da criança são estritamente PRETO NO BRANCO
  const strokeColor = '#000000'

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Alvo SVG em fundo branco puro (black on white) */}
      <div
        ref={containerRef}
        data-testid="tracing-canvas-container"
        className="relative size-[280px] sm:size-[340px] md:size-[380px] max-w-full aspect-square rounded-3xl bg-white shadow-kid-card border-4 border-kid-bg flex items-center justify-center overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
      >
        <svg
          viewBox="0 0 100 100"
          className="size-full p-4 pointer-events-none"
          preserveAspectRatio="xMidYMid meet"
          aria-label={`Guia de traçado da ${glyph.label}`}
        >
          {/* Camada 1: Corredor de tolerância (guia cinza claro no fundo branco) */}
          {glyph.strokes.map((s) => (
            <path
              key={`guide_bg_${s.id}`}
              d={s.pathData}
              fill="none"
              stroke="#f0f0f0"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Camada 2: Linha central de referência da letra (preto tracejado) */}
          {glyph.strokes.map((s) => (
            <path
              key={`guide_center_${s.id}`}
              d={s.pathData}
              fill="none"
              stroke="#000000"
              strokeWidth="3"
              strokeDasharray="4 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.4"
            />
          ))}

          {/* Camada 3: Ponto de início de cada traço (círculo preto com número/indicador) */}
          {glyph.strokes.map((s, idx) => (
            <g key={`start_dot_${s.id}`}>
              <circle
                cx={s.startPoint.x * 100}
                cy={s.startPoint.y * 100}
                r="4.5"
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {glyph.strokes.length > 1 && (
                <text
                  x={s.startPoint.x * 100}
                  y={s.startPoint.y * 100 + 1.2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="4"
                  fontWeight="bold"
                >
                  {idx + 1}
                </text>
              )}
            </g>
          ))}

          {/* Camada 4: Traços completados anteriores da criança (Fiel e Cru - Preto no Branco) */}
          {completedStrokes.map((s) => (
            <polyline
              key={s.id}
              points={s.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={state === 'completed' ? 1 : 0.9}
            />
          ))}

          {/* Camada 5: Traço ativo sendo desenhado no momento pela criança (Raw Points - Preto) */}
          {activeStrokePoints.length > 0 && (
            <polyline
              points={activeStrokePoints.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Anel de celebração quando concluído */}
          {state === 'completed' && (
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="#000000"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-spin-slow motion-reduce:animate-none"
            />
          )}
        </svg>

        {/* Overlay transparente de captura de ponteiro com touch-action none */}
        <div
          aria-hidden="true"
          className="absolute inset-0 cursor-crosshair touch-none select-none bg-transparent"
        />

        {/* Indicador de trava se concluído */}
        {state === 'completed' && (
          <div className="absolute top-3 right-3 bg-navy text-white size-8 rounded-full flex items-center justify-center shadow-clay-sm">
            <LockSimple weight="bold" className="size-5" />
          </div>
        )}
      </div>

      {/* Cue acessível de status não baseado apenas em cor (com aria-live) */}
      <div
        role="status"
        aria-live="polite"
        className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full bg-kid-card border border-kid-bg text-navy text-sm md:text-base font-bold shadow-clay-sm transition-all"
      >
        <span className="text-navy">{statusIcon}</span>
        <span>{statusText}</span>
      </div>
    </div>
  )
}
