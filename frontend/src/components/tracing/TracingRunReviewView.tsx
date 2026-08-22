/**
 * Tela/Componente de revisão detalhada de partidas para adultos (Profissionais e Responsáveis) - Tickets A4 & A5.
 * Exibe resultados numéricos gerais e por letra, status completed/abandoned,
 * painéis separados "Modelo" e "Traço da criança", replay fiel de eventos crus (sem suavização)
 * reconstruindo o traço progressivamente a cada seq/evento, playback por timestamps relativos,
 * validação estrita de modelo histórico por SHA-256 e proveniência. Sem exportação/compartilhamento/download.
 */

import {
  ArrowLeft,
  CalendarBlank,
  CheckCircle,
  Clock,
  Fingerprint,
  Gauge,
  Info,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  WarningCircle,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'

import { createGlyphGeometryFromServer, getGlyphGeometry } from '@/lib/tracing/geometry'
import {
  type BackendTracingRunOut,
  type GlyphGeometry,
  IMMUTABLE_GLYPH_SETS,
  type TracingEvidenceV1,
  type TracingNormalizedEvent,
  type TracingSessionEvidenceV1,
} from '@/lib/tracing/types'
import { cn } from '@/lib/utils'

export interface TracingRunReviewViewProps {
  session: TracingSessionEvidenceV1 | BackendTracingRunOut | null
  onBack?: () => void
  className?: string
}

interface PartialStroke {
  id: string
  points: Array<{ x: number; y: number }>
  isComplete: boolean
}

/**
 * Reconstrói fielmente os segmentos de traço desenhados pela criança até o índice de evento especificado.
 */
function rebuildPartialStrokes(
  events: TracingNormalizedEvent[],
  upToIndex: number,
): PartialStroke[] {
  const strokes: PartialStroke[] = []
  let active: PartialStroke | null = null

  for (let i = 0; i <= upToIndex && i < events.length; i++) {
    const ev = events[i]
    if (!ev) continue

    if (ev.type === 'pointerdown') {
      active = {
        id: `stroke_${strokes.length + 1}`,
        points: [{ x: ev.point.x, y: ev.point.y }],
        isComplete: false,
      }
      strokes.push(active)
    } else if (ev.type === 'pointermove') {
      if (!active) {
        active = {
          id: `stroke_${strokes.length + 1}`,
          points: [{ x: ev.point.x, y: ev.point.y }],
          isComplete: false,
        }
        strokes.push(active)
      } else {
        active.points.push({ x: ev.point.x, y: ev.point.y })
      }
    } else if (ev.type === 'pointerup') {
      if (active) {
        active.points.push({ x: ev.point.x, y: ev.point.y })
        active.isComplete = true
        active = null
      }
    } else if (ev.type === 'reset' || ev.type === 'grace_expire') {
      strokes.length = 0
      active = null
    }
  }

  return strokes
}

export function TracingRunReviewView({
  session,
  onBack,
  className = '',
}: TracingRunReviewViewProps) {
  const [selectedGlyphIndex, setSelectedGlyphIndex] = useState<number>(0)
  const [replayEventIndex, setReplayEventIndex] = useState<number>(0)
  const [isPlayingReplay, setIsPlayingReplay] = useState<boolean>(false)

  // Normalização do objeto de sessão (suporta SessionEvidence v1 ou BackendTracingRunOut)
  const normalizedData = useMemo(() => {
    if (!session) return null

    // Caso seja BackendTracingRunOut
    if ('effective_config' in session) {
      const run = session as BackendTracingRunOut
      const sequence = run.glyph_sequence || []
      const backendEvidence = run.evidence

      const glyphs = sequence.map((grapheme, idx) => {
        const glyphEvidence = backendEvidence?.glyphs?.find((g) => g.glyph_index === idx)
        const eventsForGlyph =
          backendEvidence?.events
            ?.filter((e) => e.glyph_index === idx)
            ?.map((e) => ({
              seq: e.seq,
              glyphIndex: e.glyph_index,
              segmentIndex: e.segment_index,
              type: (e.type === 'down'
                ? 'pointerdown'
                : e.type === 'move'
                  ? 'pointermove'
                  : e.type === 'up'
                    ? 'pointerup'
                    : e.type === 'reset'
                      ? 'reset'
                      : e.type === 'grace_expire'
                        ? 'grace_expire'
                        : 'pointermove') as TracingNormalizedEvent['type'],
              point: { x: e.x_norm ?? 0, y: e.y_norm ?? 0 },
              timestampMs: e.t_ms,
              pointerId: e.pointer_id,
              isOutOfBounds: !e.in_bounds,
              state: 'drawing' as const,
              score: {
                coverage: glyphEvidence?.coverage ?? 0,
                precision: glyphEvidence?.precision ?? 0,
                engagement: glyphEvidence?.engagement ?? 0,
                overall: (glyphEvidence?.score ?? 0) / 100,
              },
            })) ?? []

        return {
          schemaVersion: 'v1' as const,
          scoringVersion: 'v1' as const,
          glyphSetId: String(run.glyph_set_id ?? '1'),
          glyphSetVersion: run.glyph_set_version ?? '',
          glyphSetHash: run.glyph_set_sha256 ?? '',
          sessionId: String(run.id),
          glyphId: `glyph_${grapheme}`,
          character: grapheme,
          glyphIndex: idx,
          mode: run.contact_mode ?? 'timed_pause',
          status: (glyphEvidence?.status === 'completed' ? 'completed' : 'abandoned') as
            | 'completed'
            | 'abandoned',
          startedAt: run.started_at ?? new Date().toISOString(),
          completedAt: run.completed_at ?? null,
          isCompleted: glyphEvidence?.status === 'completed',
          threshold: run.threshold ?? 70,
          finalScore: {
            coverage: glyphEvidence?.coverage ?? 0,
            precision: glyphEvidence?.precision ?? 0,
            engagement: glyphEvidence?.engagement ?? 0,
            overall: (glyphEvidence?.score ?? 0) / 100,
          },
          scoreHistory: [],
          events: eventsForGlyph,
          strokes: (glyphEvidence?.segments ?? []).map((s) => ({
            id: `seg_${s.segment_index}`,
            glyphIndex: s.glyph_index,
            segmentIndex: s.segment_index,
            points: s.points.map(([x, y]) => ({ x, y, timestampMs: s.started_at_ms })),
            startedAtMs: s.started_at_ms,
            endedAtMs: s.ended_at_ms,
            isComplete: s.status === 'completed',
            status: s.status === 'completed' ? ('completed' as const) : ('abandoned' as const),
            outOfBoundsCount: s.in_bounds.filter((b) => !b).length,
          })),
          outOfBoundsCount: 0,
          graceExpirationsCount: 0,
          durationMs: (run.duration_seconds ?? 0) * 1000,
        }
      })

      return {
        sessionId: String(run.id),
        childName: 'Criança',
        mode: run.contact_mode ?? 'timed_pause',
        status: run.status === 'completed' ? ('completed' as const) : ('abandoned' as const),
        startedAt: run.started_at ?? new Date().toISOString(),
        completedAt: run.completed_at ?? null,
        durationMs: (run.duration_seconds ?? 0) * 1000,
        overallScore: run.score ?? 0,
        glyphSetId: String(run.glyph_set_id ?? '1'),
        glyphSetVersion: run.glyph_set_version ?? '',
        glyphSetHash: run.glyph_set_sha256 ?? '',
        serverGlyphSet: run.glyph_set,
        glyphs,
      }
    }

    // Caso seja TracingSessionEvidenceV1 direto
    const v1 = session as TracingSessionEvidenceV1
    const overallScore =
      v1.glyphs.length > 0
        ? Math.round(
            (v1.glyphs.reduce((acc, g) => acc + g.finalScore.overall, 0) / v1.glyphs.length) * 100,
          )
        : 0

    return {
      sessionId: v1.sessionId,
      childName: v1.childName,
      mode: v1.mode,
      status: v1.status,
      startedAt: v1.startedAt,
      completedAt: v1.completedAt,
      durationMs: v1.durationMs,
      overallScore,
      glyphSetId: v1.glyphSetId,
      glyphSetVersion: v1.glyphSetVersion,
      glyphSetHash: v1.glyphSetHash,
      serverGlyphSet: null,
      glyphs: v1.glyphs,
    }
  }, [session])

  const selectedGlyph: TracingEvidenceV1 | null = useMemo(() => {
    if (!normalizedData?.glyphs || normalizedData.glyphs.length === 0) return null
    return normalizedData.glyphs[selectedGlyphIndex] ?? normalizedData.glyphs[0] ?? null
  }, [normalizedData, selectedGlyphIndex])

  // Verificação de Proveniência e Integridade do Modelo Histórico (SHA-256 e versão)
  const glyphSetMetadata = useMemo(() => {
    if (!selectedGlyph && !normalizedData) return null
    const setId = selectedGlyph?.glyphSetId || normalizedData?.glyphSetId || ''
    const version = selectedGlyph?.glyphSetVersion || normalizedData?.glyphSetVersion || ''
    const hash = selectedGlyph?.glyphSetHash || normalizedData?.glyphSetHash || ''

    if (normalizedData?.serverGlyphSet) {
      const s = normalizedData.serverGlyphSet
      const matches =
        (s.artifact_sha256 === hash || s.sha256 === hash) && (s.version === version || !version)
      return {
        setId: String(s.id),
        version: s.version,
        hash: s.artifact_sha256 || s.sha256,
        isVerified: matches,
        name: s.style === 'uppercase-block' ? 'Maiúsculas bloco' : s.style,
      }
    }

    const knownSet = IMMUTABLE_GLYPH_SETS[setId]
    const isValid = Boolean(knownSet && knownSet.version === version && knownSet.hash === hash)

    return {
      setId,
      version,
      hash,
      isVerified: isValid,
      name: knownSet?.name ?? 'Conjunto desconhecido',
    }
  }, [selectedGlyph, normalizedData])

  // Geometria oficial do modelo histórico
  const targetGeometry: GlyphGeometry | null = useMemo(() => {
    if (!selectedGlyph || !glyphSetMetadata?.isVerified) return null

    // Se temos a geometria do servidor da própria partida
    if (normalizedData?.serverGlyphSet?.geometry) {
      const raw = normalizedData.serverGlyphSet.geometry[selectedGlyph.character]
      if (raw) {
        try {
          return createGlyphGeometryFromServer(selectedGlyph.character, raw)
        } catch {
          return null
        }
      }
    }

    try {
      return getGlyphGeometry(selectedGlyph.character)
    } catch {
      return null
    }
  }, [selectedGlyph, glyphSetMetadata, normalizedData])

  // Eventos do glifo para o replay progressivo
  const replayEvents: TracingNormalizedEvent[] = useMemo(() => {
    return selectedGlyph?.events ?? []
  }, [selectedGlyph])

  // Reseta índice de replay ao trocar de letra
  useEffect(() => {
    setReplayEventIndex(replayEvents.length > 0 ? replayEvents.length - 1 : 0)
    setIsPlayingReplay(false)
  }, [replayEvents.length])

  // Replay automático com base no timestamp relativo
  useEffect(() => {
    if (!isPlayingReplay) return
    if (replayEvents.length === 0) {
      setIsPlayingReplay(false)
      return
    }

    if (replayEventIndex >= replayEvents.length - 1) {
      setIsPlayingReplay(false)
      return
    }

    const currentEv = replayEvents[replayEventIndex]
    const nextEv = replayEvents[replayEventIndex + 1]
    const deltaMs =
      currentEv && nextEv
        ? Math.max(16, Math.min(250, nextEv.timestampMs - currentEv.timestampMs))
        : 30

    const timer = setTimeout(() => {
      setReplayEventIndex((prev) => prev + 1)
    }, deltaMs)

    return () => clearTimeout(timer)
  }, [isPlayingReplay, replayEventIndex, replayEvents])

  // Reconstrução dos traços desenhados até o momento do replay
  const currentRenderedStrokes = useMemo(() => {
    return rebuildPartialStrokes(replayEvents, replayEventIndex)
  }, [replayEvents, replayEventIndex])

  if (!normalizedData) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
        <p className="text-sm font-bold text-kid-muted">
          Nenhuma partida selecionada para auditoria.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-kid-bg px-5 py-2 text-xs font-bold text-navy hover:bg-border"
          >
            <ArrowLeft weight="bold" className="size-4" />
            Voltar
          </button>
        )}
      </div>
    )
  }

  const currentReplayEvent = replayEvents[replayEventIndex] ?? null

  return (
    <div className={cn('flex flex-col gap-6 max-w-5xl mx-auto w-full text-navy', className)}>
      {/* Barra de Topo com Ações e Identificação da Partida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-kid-bg pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar para a listagem"
              className="flex size-10 items-center justify-center rounded-2xl bg-white border border-border text-navy hover:bg-kid-bg transition-colors"
            >
              <ArrowLeft weight="bold" className="size-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black">Auditoria de Partida de Traçado</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-black uppercase',
                  normalizedData.status === 'completed'
                    ? 'bg-turquoise/15 text-turquoise'
                    : 'bg-coral/15 text-coral',
                )}
              >
                {normalizedData.status === 'completed' ? 'Concluída' : 'Abandonada'}
              </span>
            </div>
            <p className="text-xs text-kid-muted font-medium">
              Sessão ID: <span className="font-mono text-navy">{normalizedData.sessionId}</span>
            </p>
          </div>
        </div>

        {/* Metadados da Sessão */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 border border-kid-bg">
            <CalendarBlank weight="bold" className="size-4 text-kid-muted" />
            <span>{new Date(normalizedData.startedAt).toLocaleString('pt-BR')}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 border border-kid-bg">
            <Clock weight="bold" className="size-4 text-kid-muted" />
            <span>{Math.round(normalizedData.durationMs / 1000)}s de duração</span>
          </div>
        </div>
      </div>

      {/* Cartões de Métricas Globais da Partida */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-kid-bg flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-bold text-kid-muted uppercase">Pontuação Geral</span>
          <span className="text-2xl sm:text-3xl font-black text-blue">
            {normalizedData.overallScore}
            <span className="text-sm font-bold text-kid-muted">/100</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-bold text-kid-muted uppercase">Letras Concluídas</span>
          <span className="text-2xl sm:text-3xl font-black text-navy">
            {normalizedData.glyphs.filter((g) => g.status === 'completed').length}
            <span className="text-sm font-bold text-kid-muted">
              /{normalizedData.glyphs.length}
            </span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-bold text-kid-muted uppercase">Modo de Contato</span>
          <span className="text-base sm:text-lg font-extrabold text-navy truncate">
            {normalizedData.mode === 'strict_continuous'
              ? 'Contínuo estrito'
              : normalizedData.mode === 'timed_pause'
                ? 'Pausa com prazo'
                : 'Livre'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-kid-bg flex flex-col gap-1 shadow-sm">
          <span className="text-xs font-bold text-kid-muted uppercase">Integridade do Modelo</span>
          <div className="flex items-center gap-1.5">
            {glyphSetMetadata?.isVerified ? (
              <>
                <CheckCircle weight="fill" className="size-5 text-turquoise shrink-0" />
                <span className="text-xs font-bold text-turquoise truncate">
                  Verificado SHA-256
                </span>
              </>
            ) : (
              <>
                <WarningCircle weight="fill" className="size-5 text-coral shrink-0" />
                <span className="text-xs font-bold text-coral truncate">Divergência de Hash</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Seletor de Letras do Nome */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase text-kid-muted">Sequência de Letras:</span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {normalizedData.glyphs.map((glyph, idx) => {
            const isSelected = idx === selectedGlyphIndex
            const isCompleted = glyph.status === 'completed'
            return (
              <button
                key={`review_glyph_${glyph.glyphId}_${glyph.glyphIndex}`}
                type="button"
                onClick={() => setSelectedGlyphIndex(idx)}
                className={cn(
                  'flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition-all border shrink-0',
                  isSelected
                    ? 'bg-blue text-white border-blue shadow-clay-sm'
                    : isCompleted
                      ? 'bg-white text-navy border-kid-bg hover:border-blue/30'
                      : 'bg-coral/5 text-coral border-coral/20',
                )}
              >
                <span>{glyph.character}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-bold',
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isCompleted
                        ? 'bg-turquoise/15 text-turquoise'
                        : 'bg-coral/15 text-coral',
                  )}
                >
                  {Math.round(glyph.finalScore.overall * 100)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Painéis Centrais: Modelo vs Traço Real */}
      {selectedGlyph && (
        <div className="grid md:grid-cols-2 gap-4 items-stretch">
          {/* 1. Painel: Modelo Canônico / Alvo de Referência */}
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 border border-kid-bg shadow-sm">
            <div className="flex items-center justify-between border-b border-kid-bg pb-3">
              <div className="flex items-center gap-2">
                <Gauge weight="bold" className="size-5 text-blue" />
                <h3 className="text-base font-extrabold">
                  Modelo da Letra {selectedGlyph.character}
                </h3>
              </div>
              <span className="text-xs font-bold text-kid-muted">Alvo de Referência</span>
            </div>

            <div className="flex flex-1 items-center justify-center min-h-[260px] bg-cream/60 rounded-2xl border border-kid-bg relative p-4">
              {targetGeometry ? (
                <svg
                  viewBox="0 0 100 100"
                  className="size-56"
                  aria-label={`Modelo canônico da letra ${selectedGlyph.character}`}
                >
                  {/* Corredor de tolerância */}
                  {targetGeometry.strokes.map((s) => (
                    <path
                      key={`guide_bg_${s.id}`}
                      d={s.pathData}
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth={targetGeometry.toleranceRadius * 200}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {/* Linha central pontilhada */}
                  {targetGeometry.strokes.map((s) => (
                    <path
                      key={`guide_center_${s.id}`}
                      d={s.pathData}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3"
                      strokeDasharray="4 4"
                    />
                  ))}
                  {/* Ponto de partida */}
                  {targetGeometry.strokes.map((s) => (
                    <circle
                      key={`guide_dot_${s.id}`}
                      cx={s.startPoint.x * 100}
                      cy={s.startPoint.y * 100}
                      r="4"
                      fill="#0284c7"
                    />
                  ))}
                </svg>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center p-6">
                  <WarningCircle weight="bold" className="size-10 text-coral" />
                  <p className="text-sm font-bold text-navy">Modelo indisponível</p>
                  <p className="text-xs text-kid-muted max-w-xs">
                    O modelo original desta versão/hash não está disponível localmente.
                  </p>
                </div>
              )}
            </div>

            {/* Metadados do Modelo */}
            <div className="flex items-center justify-between text-xs text-kid-muted pt-2 border-t border-kid-bg">
              <span className="truncate">
                Conjunto: <strong>{glyphSetMetadata?.name}</strong>
              </span>
              <span className="font-mono text-[11px] truncate">
                Hash: {glyphSetMetadata?.hash?.slice(0, 16)}...
              </span>
            </div>
          </div>

          {/* 2. Painel: Traço da Criança e Replay Progressivo */}
          <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 border border-kid-bg shadow-sm">
            <div className="flex items-center justify-between border-b border-kid-bg pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint weight="bold" className="size-5 text-turquoise" />
                <h3 className="text-base font-extrabold">Traço Real da Criança</h3>
              </div>
              <span
                className={cn(
                  'text-xs font-extrabold px-2.5 py-0.5 rounded-full',
                  selectedGlyph.status === 'completed'
                    ? 'bg-turquoise/15 text-turquoise'
                    : 'bg-coral/15 text-coral',
                )}
              >
                {selectedGlyph.status === 'completed' ? 'Concluído' : 'Abandonado'}
              </span>
            </div>

            {/* Canvas de Reprodução Progressiva */}
            <div className="flex flex-1 items-center justify-center min-h-[260px] bg-white rounded-2xl border-2 border-kid-bg relative p-4 overflow-hidden">
              <svg
                viewBox="0 0 100 100"
                className="size-56"
                aria-label={`Traçado registrado da letra ${selectedGlyph.character}`}
              >
                {/* Linha guia de fundo semitransparente */}
                {targetGeometry?.strokes.map((s) => (
                  <path
                    key={`bg_guide_${s.id}`}
                    d={s.pathData}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {/* Traços renderizados progressivamente */}
                {currentRenderedStrokes.map((stroke) => {
                  if (stroke.points.length === 0) return null
                  const p0 = stroke.points[0]
                  if (!p0) return null
                  const pathData =
                    stroke.points.length === 1
                      ? `M ${p0.x * 100} ${p0.y * 100} L ${p0.x * 100} ${p0.y * 100}`
                      : `M ${stroke.points.map((p) => `${p.x * 100} ${p.y * 100}`).join(' L ')}`

                  return (
                    <path
                      key={stroke.id}
                      d={pathData}
                      fill="none"
                      stroke="#0D79F0"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )
                })}

                {/* Ponto atual do cursor de replay */}
                {currentReplayEvent && currentReplayEvent.type !== 'reset' && (
                  <circle
                    cx={currentReplayEvent.point.x * 100}
                    cy={currentReplayEvent.point.y * 100}
                    r="4"
                    fill="#F6552D"
                    className="animate-pulse"
                  />
                )}
              </svg>
            </div>

            {/* Controles de Replay e Linha do Tempo */}
            <div className="flex flex-col gap-2 pt-2 border-t border-kid-bg">
              <div className="flex items-center justify-between text-xs text-kid-muted font-bold">
                <span>
                  Evento {replayEvents.length > 0 ? replayEventIndex + 1 : 0} de{' '}
                  {replayEvents.length}
                </span>
                <span>
                  Tempo:{' '}
                  {currentReplayEvent
                    ? `${(currentReplayEvent.timestampMs / 1000).toFixed(2)}s`
                    : '0s'}
                </span>
              </div>

              {/* Barra Scrubber do Replay */}
              <input
                type="range"
                min="0"
                max={Math.max(0, replayEvents.length - 1)}
                value={replayEventIndex}
                disabled={replayEvents.length === 0}
                onChange={(e) => {
                  setReplayEventIndex(Number(e.target.value))
                  setIsPlayingReplay(false)
                }}
                className="w-full h-2 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
              />

              {/* Botões de Reprodução */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setReplayEventIndex((prev) => Math.max(0, prev - 1))
                    setIsPlayingReplay(false)
                  }}
                  disabled={replayEventIndex <= 0}
                  className="size-9 rounded-full bg-kid-bg flex items-center justify-center text-navy hover:bg-border disabled:opacity-40"
                >
                  <SkipBack weight="bold" className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlayingReplay((prev) => !prev)}
                  disabled={replayEvents.length === 0}
                  className="h-9 px-4 rounded-full bg-blue text-white flex items-center gap-1.5 text-xs font-bold shadow-clay-sm hover:bg-blue-dark disabled:opacity-40"
                >
                  {isPlayingReplay ? (
                    <>
                      <Pause weight="fill" className="size-4" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play weight="fill" className="size-4" /> Reproduzir Replay
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplayEventIndex((prev) => Math.min(replayEvents.length - 1, prev + 1))
                    setIsPlayingReplay(false)
                  }}
                  disabled={replayEventIndex >= replayEvents.length - 1}
                  className="size-9 rounded-full bg-kid-bg flex items-center justify-center text-navy hover:bg-border disabled:opacity-40"
                >
                  <SkipForward weight="bold" className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel de Métricas Detalhadas da Letra Selecionada */}
      {selectedGlyph && (
        <div className="p-5 rounded-3xl bg-white border border-kid-bg flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-kid-bg pb-3">
            <Info weight="bold" className="size-5 text-blue" />
            <h3 className="text-base font-extrabold">
              Métricas Detalhadas da Letra {selectedGlyph.character}
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-cream">
              <span className="text-xs font-bold text-kid-muted block uppercase">Cobertura</span>
              <strong className="text-xl font-black text-navy">
                {Math.round(selectedGlyph.finalScore.coverage * 100)}%
              </strong>
              <span className="text-[10px] text-kid-muted block">Extensão do alvo atingida</span>
            </div>

            <div className="p-3 rounded-2xl bg-cream">
              <span className="text-xs font-bold text-kid-muted block uppercase">Precisão</span>
              <strong className="text-xl font-black text-navy">
                {Math.round(selectedGlyph.finalScore.precision * 100)}%
              </strong>
              <span className="text-[10px] text-kid-muted block">Traço dentro da tolerância</span>
            </div>

            <div className="p-3 rounded-2xl bg-cream">
              <span className="text-xs font-bold text-kid-muted block uppercase">Engajamento</span>
              <strong className="text-xl font-black text-navy">
                {Math.round(selectedGlyph.finalScore.engagement * 100)}%
              </strong>
              <span className="text-[10px] text-kid-muted block">
                Comprimento de traçado válido
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-blue/10">
              <span className="text-xs font-bold text-blue block uppercase">Pontuação Final</span>
              <strong className="text-xl font-black text-blue">
                {Math.round(selectedGlyph.finalScore.overall * 100)}%
              </strong>
              <span className="text-[10px] text-blue font-semibold block">
                Limiar exigido: {selectedGlyph.threshold}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
