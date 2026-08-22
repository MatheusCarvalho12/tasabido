/**
 * Tela/Componente de revisão detalhada de partidas para adultos (Profissionais e Responsáveis) - Ticket A4.
 * Exibe resultados numéricos gerais e por letra, status completed/abandoned,
 * painéis separados "Modelo" e "Traço da criança", replay fiel de eventos crus (sem suavização)
 * e estado de evidência indisponível. Sem botões de exportação/compartilhamento/download.
 */

import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  Gauge,
  Info,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  WarningCircle,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'

import { getGlyphGeometry } from '@/lib/tracing/geometry'
import type {
  GlyphGeometry,
  TracingEvidenceV1,
  TracingNormalizedEvent,
  TracingSessionEvidenceV1,
} from '@/lib/tracing/types'
import { cn } from '@/lib/utils'

export interface TracingRunReviewViewProps {
  session: TracingSessionEvidenceV1 | null
  onBack?: () => void
  className?: string
}

export function TracingRunReviewView({
  session,
  onBack,
  className = '',
}: TracingRunReviewViewProps) {
  const [selectedGlyphIndex, setSelectedGlyphIndex] = useState<number>(0)
  const [replayEventIndex, setReplayEventIndex] = useState<number>(0)
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false)

  const selectedGlyph: TracingEvidenceV1 | null = useMemo(() => {
    if (!session?.glyphs || session.glyphs.length === 0) return null
    return session.glyphs[selectedGlyphIndex] ?? session.glyphs[0] ?? null
  }, [session, selectedGlyphIndex])

  const glyphGeometry: GlyphGeometry | null = useMemo(() => {
    if (!selectedGlyph) return null
    try {
      return getGlyphGeometry(selectedGlyph.character)
    } catch {
      return null
    }
  }, [selectedGlyph])

  // Reseta o índice de replay ao trocar de letra
  useEffect(() => {
    setReplayEventIndex(selectedGlyph?.events?.length ? selectedGlyph.events.length - 1 : 0)
    setIsPlayingReplay(false)
  }, [selectedGlyph])

  // Timer de reprodução do replay
  useEffect(() => {
    if (!isPlayingReplay || !selectedGlyph?.events?.length) return

    const interval = setInterval(() => {
      setReplayEventIndex((prev) => {
        if (prev >= selectedGlyph.events.length - 1) {
          setIsPlayingReplay(false)
          return prev
        }
        return prev + 1
      })
    }, 40)

    return () => clearInterval(interval)
  }, [isPlayingReplay, selectedGlyph?.events])

  // Estado: Evidência indisponível
  if (!session?.glyphs || session.glyphs.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 bg-cream rounded-3xl border-2 border-kid-bg text-center gap-4',
          className,
        )}
      >
        <div className="size-16 rounded-full bg-kid-bg flex items-center justify-center text-kid-muted">
          <Info weight="bold" className="size-8" />
        </div>
        <h2 className="text-xl font-extrabold text-navy">Evidência de traçado indisponível</h2>
        <p className="text-sm text-kid-muted font-medium max-w-sm">
          Não há dados de telemetria ou histórico de eventos registrado para esta partida.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="h-11 px-6 rounded-full bg-blue text-white text-sm font-bold shadow-clay-btn hover:bg-blue-dark"
          >
            Voltar
          </button>
        )}
      </div>
    )
  }

  // Métricas agregadas da sessão
  const overallAverage = Math.round(
    (session.glyphs.reduce((acc, g) => acc + g.finalScore.overall, 0) / session.glyphs.length) *
      100,
  )
  const coverageAverage = Math.round(
    (session.glyphs.reduce((acc, g) => acc + g.finalScore.coverage, 0) / session.glyphs.length) *
      100,
  )
  const precisionAverage = Math.round(
    (session.glyphs.reduce((acc, g) => acc + g.finalScore.precision, 0) / session.glyphs.length) *
      100,
  )
  const engagementAverage = Math.round(
    (session.glyphs.reduce((acc, g) => acc + g.finalScore.engagement, 0) / session.glyphs.length) *
      100,
  )

  const durationSeconds = Math.round(session.durationMs / 1000)
  const formattedDate = new Date(session.startedAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const currentReplayEvent: TracingNormalizedEvent | null =
    selectedGlyph?.events?.[replayEventIndex] ?? null

  return (
    <div
      className={cn('flex flex-col gap-6 max-w-5xl mx-auto w-full font-sans text-navy', className)}
    >
      {/* Cabeçalho da Partida */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-white border border-kid-bg shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="size-10 rounded-full bg-kid-bg flex items-center justify-center text-navy hover:bg-border transition-colors"
            >
              <ArrowLeft weight="bold" className="size-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-navy">
              Avaliação de Traçado: {session.childName}
            </h1>
            <div className="flex items-center gap-3 text-xs text-kid-muted font-bold mt-0.5">
              <span className="flex items-center gap-1">
                <CalendarBlank weight="bold" className="size-3.5" />
                {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock weight="bold" className="size-3.5" />
                {durationSeconds} segundos
              </span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {session.status === 'completed' ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-turquoise/15 text-turquoise-dark text-xs sm:text-sm font-black border border-turquoise/30">
              <CheckCircle weight="fill" className="size-4 text-turquoise" />
              Partida Concluída
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-coral/15 text-coral-dark text-xs sm:text-sm font-black border border-coral/30">
              <WarningCircle weight="fill" className="size-4 text-coral" />
              Partida Abandonada
            </span>
          )}
        </div>
      </div>

      {/* Resultados Gerais Numéricos (Painel do Adulto) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-kid-bg shadow-sm flex flex-col">
          <span className="text-xs font-bold text-kid-muted">Pontuação Geral</span>
          <span className="text-2xl sm:text-3xl font-black text-blue mt-1">{overallAverage}%</span>
          <span className="text-[11px] font-medium text-kid-muted mt-0.5">
            Média de todas as letras
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg shadow-sm flex flex-col">
          <span className="text-xs font-bold text-kid-muted">Cobertura (Coverage)</span>
          <span className="text-2xl sm:text-3xl font-black text-navy mt-1">{coverageAverage}%</span>
          <span className="text-[11px] font-medium text-kid-muted mt-0.5">Guia percorrida</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg shadow-sm flex flex-col">
          <span className="text-xs font-bold text-kid-muted">Precisão (Precision)</span>
          <span className="text-2xl sm:text-3xl font-black text-navy mt-1">
            {precisionAverage}%
          </span>
          <span className="text-[11px] font-medium text-kid-muted mt-0.5">
            Traço dentro do corredor
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg shadow-sm flex flex-col">
          <span className="text-xs font-bold text-kid-muted">Engajamento</span>
          <span className="text-2xl sm:text-3xl font-black text-navy mt-1">
            {engagementAverage}%
          </span>
          <span className="text-[11px] font-medium text-kid-muted mt-0.5">Extensão válida</span>
        </div>
      </div>

      {/* Seletor de Glifo da Sessão */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase text-kid-muted px-1">
          Selecione a letra para auditar detalhadamente:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {session.glyphs.map((glyph, idx) => {
            const isSelected = selectedGlyphIndex === idx
            const scorePercent = Math.round(glyph.finalScore.overall * 100)
            return (
              <button
                key={`glyph_tab_${glyph.glyphId}_${glyph.glyphIndex}`}
                type="button"
                onClick={() => setSelectedGlyphIndex(idx)}
                className={cn(
                  'flex flex-col items-center gap-1 min-w-16 px-3 py-2 rounded-2xl border transition-all text-navy',
                  isSelected
                    ? 'border-blue bg-blue/10 shadow-clay-sm ring-2 ring-blue/20 font-black'
                    : 'border-kid-bg bg-white hover:bg-kid-bg/50 font-bold',
                )}
              >
                <span className="text-xl">{glyph.character}</span>
                <span
                  className={cn(
                    'text-[11px] px-1.5 py-0.5 rounded-full',
                    glyph.isCompleted
                      ? 'bg-turquoise/20 text-turquoise-dark font-extrabold'
                      : 'bg-coral/20 text-coral-dark font-extrabold',
                  )}
                >
                  {scorePercent}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detalhes do Glifo Selecionado */}
      {selectedGlyph && (
        <div className="flex flex-col gap-6 p-5 sm:p-6 rounded-3xl bg-white border border-kid-bg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kid-bg pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-navy">
                Letra {selectedGlyph.character} (Glifo #{selectedGlyph.glyphIndex + 1})
              </h2>
              <p className="text-xs text-kid-muted font-medium">
                Modo: {selectedGlyph.mode} • Limiar exigido:{' '}
                {Math.round(selectedGlyph.threshold * 100)}% • Duração:{' '}
                {Math.round(selectedGlyph.durationMs / 1000)}s
              </p>
            </div>

            {/* Scores detalhados numéricos desta letra */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-kid-bg font-bold">
                Coverage: {Math.round(selectedGlyph.finalScore.coverage * 100)}%
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-kid-bg font-bold">
                Precision: {Math.round(selectedGlyph.finalScore.precision * 100)}%
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-kid-bg font-bold">
                Engagement: {Math.round(selectedGlyph.finalScore.engagement * 100)}%
              </span>
              <span className="px-3 py-1 rounded-xl bg-blue text-white font-black">
                Score: {Math.round(selectedGlyph.finalScore.overall * 100)}%
              </span>
            </div>
          </div>

          {/* Painéis Lado a Lado: Modelo vs Traço da Criança */}
          <div className="grid sm:grid-cols-2 gap-6">
            {/* PAINEL 1: MODELO */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-cream border border-kid-bg">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-extrabold uppercase text-kid-muted">
                  Painel 1: Modelo Canônico
                </span>
                <span className="text-xs font-bold text-blue">Geometria Alvo</span>
              </div>

              <div className="size-64 sm:size-72 bg-white rounded-2xl border-2 border-kid-bg flex items-center justify-center p-3 shadow-inner">
                {glyphGeometry && (
                  <svg
                    viewBox="0 0 100 100"
                    className="size-full"
                    aria-label={`Geometria do modelo da letra ${selectedGlyph.character}`}
                  >
                    {/* Corredor de tolerância */}
                    {glyphGeometry.strokes.map((s) => (
                      <path
                        key={`m_bg_${s.id}`}
                        d={s.pathData}
                        fill="none"
                        stroke="#f0f0f0"
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {/* Linha central */}
                    {glyphGeometry.strokes.map((s) => (
                      <path
                        key={`m_center_${s.id}`}
                        d={s.pathData}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="3"
                        strokeDasharray="4 4"
                      />
                    ))}
                    {/* Pontos de início */}
                    {glyphGeometry.strokes.map((s, i) => (
                      <g key={`m_dot_${s.id}`}>
                        <circle
                          cx={s.startPoint.x * 100}
                          cy={s.startPoint.y * 100}
                          r="4"
                          fill="#000000"
                        />
                        <text
                          x={s.startPoint.x * 100}
                          y={s.startPoint.y * 100 + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#ffffff"
                          fontSize="3.5"
                          fontWeight="bold"
                        >
                          {i + 1}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
              <span className="text-[11px] text-kid-muted font-medium">
                Padrão geométrico canônico do catálogo do Tá Sabido
              </span>
            </div>

            {/* PAINEL 2: TRAÇO DA CRIANÇA (Cru / Fiel) */}
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-cream border border-kid-bg">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-extrabold uppercase text-kid-muted">
                  Painel 2: Traço da Criança
                </span>
                <span className="text-xs font-bold text-navy">
                  {selectedGlyph.strokes.length} traço(s) registrado(s)
                </span>
              </div>

              <div className="size-64 sm:size-72 bg-white rounded-2xl border-2 border-kid-bg flex items-center justify-center p-3 shadow-inner relative">
                <svg
                  viewBox="0 0 100 100"
                  className="size-full"
                  aria-label={`Traçado registrado da letra ${selectedGlyph.character}`}
                >
                  {/* Guia sutil de fundo para contexto */}
                  {glyphGeometry?.strokes.map((s) => (
                    <path
                      key={`child_ref_${s.id}`}
                      d={s.pathData}
                      fill="none"
                      stroke="#f5f5f5"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                  ))}

                  {/* Traços crus da criança (Sem suavização / sem embelezamento artificial) */}
                  {selectedGlyph.strokes.map((stroke, sIdx) => {
                    if (stroke.points.length === 0) return null
                    const ptsString = stroke.points
                      .map((p) => `${p.x * 100},${p.y * 100}`)
                      .join(' ')
                    return (
                      <polyline
                        key={`child_s_${stroke.id || sIdx}`}
                        points={ptsString}
                        fill="none"
                        stroke="#000000"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )
                  })}

                  {/* Marcador do ponto atual no Replay */}
                  {currentReplayEvent && (
                    <circle
                      cx={currentReplayEvent.point.x * 100}
                      cy={currentReplayEvent.point.y * 100}
                      r="4"
                      fill="#04A4AB"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                  )}
                </svg>
              </div>
              <span className="text-[11px] text-kid-muted font-medium">
                Renderização fiel dos pontos amostrados (telemetria crua)
              </span>
            </div>
          </div>

          {/* Player de Replay Determinístico de Eventos */}
          {selectedGlyph.events && selectedGlyph.events.length > 0 && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-kid-bg/40 border border-kid-bg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge weight="bold" className="size-4 text-blue" />
                  <span className="text-xs font-extrabold uppercase text-navy">
                    Replay Fiel de Eventos ({replayEventIndex + 1} de {selectedGlyph.events.length})
                  </span>
                </div>
                {currentReplayEvent && (
                  <div className="flex items-center gap-2 text-[11px] font-bold text-kid-muted">
                    <span>Tipo: {currentReplayEvent.type}</span>
                    <span>•</span>
                    <span>Seq: #{currentReplayEvent.seq}</span>
                    <span>•</span>
                    <span>Tempo: {currentReplayEvent.timestampMs}ms</span>
                    {currentReplayEvent.isOutOfBounds && (
                      <span className="text-coral font-black">(Fora da borda)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Barra de progresso do replay */}
              <input
                type="range"
                min="0"
                max={selectedGlyph.events.length - 1}
                value={replayEventIndex}
                onChange={(e) => {
                  setIsPlayingReplay(false)
                  setReplayEventIndex(Number(e.target.value))
                }}
                className="w-full h-2 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
              />

              {/* Controles de Replay */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayingReplay(false)
                      setReplayEventIndex(0)
                    }}
                    aria-label="Voltar ao início do traçado"
                    className="size-8 rounded-full bg-white border border-border flex items-center justify-center text-navy hover:bg-kid-bg"
                  >
                    <SkipBack weight="bold" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPlayingReplay(!isPlayingReplay)}
                    aria-label={isPlayingReplay ? 'Pausar replay' : 'Iniciar replay'}
                    className="h-8 px-4 rounded-full bg-blue text-white text-xs font-bold shadow-clay-sm flex items-center gap-1.5 hover:bg-blue-dark"
                  >
                    {isPlayingReplay ? (
                      <>
                        <Pause weight="bold" className="size-3.5" />
                        Pausar
                      </>
                    ) : (
                      <>
                        <Play weight="fill" className="size-3.5" />
                        Reproduzir
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayingReplay(false)
                      setReplayEventIndex(selectedGlyph.events.length - 1)
                    }}
                    aria-label="Avançar ao final do traçado"
                    className="size-8 rounded-full bg-white border border-border flex items-center justify-center text-navy hover:bg-kid-bg"
                  >
                    <SkipForward weight="bold" className="size-4" />
                  </button>
                </div>

                <span className="text-xs text-kid-muted font-medium">
                  {selectedGlyph.outOfBoundsCount > 0
                    ? `${selectedGlyph.outOfBoundsCount} desvio(s) fora da área`
                    : 'Nenhum desvio fora da área'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
