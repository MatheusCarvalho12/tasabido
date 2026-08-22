/**
 * Motor de traçado determinístico e independente de framework (Ticket A1).
 * Implementa máquina de estados estrita/temporizada/livre, trava de ponteiro único,
 * pontuação contínua e esquema serializável de evidência v1.
 */

import { calculateLiveScore } from './scorer'
import type {
  GlyphGeometry,
  Point,
  TimestampedPoint,
  TracingEngineOptions,
  TracingEvidenceV1,
  TracingMode,
  TracingNormalizedEvent,
  TracingScore,
  TracingState,
  TracingStroke,
} from './types'

const DEFAULT_GRACE_DURATION_MS = 1500
const DEFAULT_COMPLETION_THRESHOLD = 0.75

export class TracingEngine {
  private readonly glyph: GlyphGeometry
  private readonly mode: TracingMode
  private readonly graceDurationMs: number
  private readonly completionThreshold: number
  private readonly sessionId: string
  private readonly clock: () => number

  private state: TracingState = 'ready'
  private isLocked = false
  private activePointerId: number | null = null
  private currentStroke: TracingStroke | null = null
  private strokes: TracingStroke[] = []
  private events: TracingNormalizedEvent[] = []
  private scoreHistory: Array<{ timestampMs: number; score: TracingScore }> = []

  private currentScore: TracingScore = {
    coverage: 0,
    precision: 1,
    engagement: 0,
    overall: 0,
  }

  private startTimeMs: number
  private completedTimeMs: number | null = null
  private outOfBoundsCount = 0
  private graceExpirationsCount = 0

  private graceTimer: ReturnType<typeof setTimeout> | null = null
  private graceInterval: ReturnType<typeof setInterval> | null = null
  private graceStartedAtMs: number | null = null

  private readonly onStateChange?: (state: TracingState, previousState: TracingState) => void
  private readonly onScoreChange?: (score: TracingScore) => void
  private readonly onGraceTick?: (remainingMs: number, totalMs: number) => void
  private readonly onComplete?: (evidence: TracingEvidenceV1) => void
  private readonly onReset?: () => void

  constructor(options: TracingEngineOptions) {
    this.glyph = options.glyph
    this.mode = options.mode ?? 'strict_continuous'
    this.graceDurationMs = options.graceDurationMs ?? DEFAULT_GRACE_DURATION_MS
    this.completionThreshold =
      options.completionThreshold ?? this.glyph.completionThreshold ?? DEFAULT_COMPLETION_THRESHOLD
    this.sessionId =
      options.sessionId ?? `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    this.clock =
      options.clock ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()))

    this.onStateChange = options.onStateChange
    this.onScoreChange = options.onScoreChange
    this.onGraceTick = options.onGraceTick
    this.onComplete = options.onComplete
    this.onReset = options.onReset

    this.startTimeMs = this.clock()
    this.recordScoreSnapshot()
  }

  public getState(): TracingState {
    return this.state
  }

  public getScore(): TracingScore {
    return { ...this.currentScore }
  }

  public getStrokes(): TracingStroke[] {
    return this.strokes.map((s) => ({
      ...s,
      points: [...s.points],
    }))
  }

  public getGlyph(): GlyphGeometry {
    return this.glyph
  }

  public getMode(): TracingMode {
    return this.mode
  }

  public getIsLocked(): boolean {
    return this.isLocked
  }

  public getActivePointerId(): number | null {
    return this.activePointerId
  }

  private setState(newState: TracingState): void {
    if (this.state === newState) return
    const prev = this.state
    this.state = newState
    this.onStateChange?.(newState, prev)
  }

  private now(): number {
    return this.clock()
  }

  private recordNormalizedEvent(
    type: TracingNormalizedEvent['type'],
    point: Point,
    pointerId: number,
    isOutOfBounds: boolean,
  ): void {
    const event: TracingNormalizedEvent = {
      type,
      point: { x: Math.round(point.x * 1000) / 1000, y: Math.round(point.y * 1000) / 1000 },
      timestampMs: Math.round(this.now() - this.startTimeMs),
      pointerId,
      isOutOfBounds,
      state: this.state,
      score: { ...this.currentScore },
    }
    this.events.push(event)
  }

  private recordScoreSnapshot(): void {
    this.scoreHistory.push({
      timestampMs: Math.round(this.now() - this.startTimeMs),
      score: { ...this.currentScore },
    })
  }

  private recalculateScore(): void {
    const elapsed = this.now() - this.startTimeMs
    const allStrokes = this.currentStroke ? [...this.strokes, this.currentStroke] : this.strokes
    const newScore = calculateLiveScore(allStrokes, this.glyph, elapsed)

    const changed =
      newScore.overall !== this.currentScore.overall ||
      newScore.coverage !== this.currentScore.coverage ||
      newScore.precision !== this.currentScore.precision

    this.currentScore = newScore

    if (changed) {
      this.recordScoreSnapshot()
      this.onScoreChange?.(this.currentScore)
    }

    // Se o score atingiu o limiar durante o toque, passa para valid_touching
    if (this.state === 'drawing' && this.currentScore.overall >= this.completionThreshold) {
      this.setState('valid_touching')
    } else if (
      this.state === 'valid_touching' &&
      this.currentScore.overall < this.completionThreshold
    ) {
      // Se a criança rabiscou e a precisão/overall caiu abaixo do limiar, volta a drawing
      this.setState('drawing')
    }
  }

  /** Inicia ou retoma o traçado no evento pointerdown. */
  public handlePointerDown(
    x: number,
    y: number,
    pointerId: number,
    isOutOfBounds = false,
  ): boolean {
    if (this.isLocked || this.state === 'completed') {
      return false
    }

    // Trava de ponteiro único: rejeita toques secundários se já houver um ponteiro ativo
    if (this.activePointerId !== null && this.activePointerId !== pointerId) {
      return false
    }

    this.activePointerId = pointerId

    // Se estava em contagem de carência (timed_pause), cancela o timer e retoma o traçado
    if (this.state === 'grace') {
      this.cancelGraceTimer()
      this.recordNormalizedEvent('grace_resume', { x, y }, pointerId, isOutOfBounds)
    }

    const startTimestamp = this.now()
    const checkOutOfBounds = isOutOfBounds || x < 0 || x > 1 || y < 0 || y > 1
    if (checkOutOfBounds) {
      this.outOfBoundsCount++
    }

    const firstPoint: TimestampedPoint = {
      x,
      y,
      timestampMs: Math.round(startTimestamp - this.startTimeMs),
      isOutOfBounds: checkOutOfBounds,
    }

    this.currentStroke = {
      id: `stroke_${this.strokes.length + 1}_${Math.round(startTimestamp)}`,
      points: [firstPoint],
      startedAtMs: Math.round(startTimestamp - this.startTimeMs),
      endedAtMs: null,
      isComplete: false,
      outOfBoundsCount: checkOutOfBounds ? 1 : 0,
    }

    this.setState('drawing')
    this.recalculateScore()
    this.recordNormalizedEvent('pointerdown', { x, y }, pointerId, checkOutOfBounds)
    return true
  }

  /** Processa a movimentação do ponteiro (pointermove). */
  public handlePointerMove(
    x: number,
    y: number,
    pointerId: number,
    isOutOfBounds = false,
  ): boolean {
    if (this.isLocked || this.state === 'completed') {
      return false
    }

    if (this.activePointerId !== pointerId || !this.currentStroke) {
      return false
    }

    const checkOutOfBounds = isOutOfBounds || x < 0 || x > 1 || y < 0 || y > 1
    if (checkOutOfBounds) {
      this.outOfBoundsCount++
      this.currentStroke.outOfBoundsCount++
    }

    const point: TimestampedPoint = {
      x,
      y,
      timestampMs: Math.round(this.now() - this.startTimeMs),
      isOutOfBounds: checkOutOfBounds,
    }

    this.currentStroke.points.push(point)
    this.recalculateScore()
    this.recordNormalizedEvent('pointermove', { x, y }, pointerId, checkOutOfBounds)
    return true
  }

  /**
   * Processa o levantamento do ponteiro (pointerup).
   * A conclusão SÓ ocorre quando o ponteiro é solto com score >= threshold.
   */
  public handlePointerUp(x: number, y: number, pointerId: number, isOutOfBounds = false): boolean {
    if (this.isLocked || this.state === 'completed') {
      return false
    }

    if (this.activePointerId !== pointerId || !this.currentStroke) {
      return false
    }

    const checkOutOfBounds = isOutOfBounds || x < 0 || x > 1 || y < 0 || y > 1
    const endTimestamp = this.now()

    this.currentStroke.endedAtMs = Math.round(endTimestamp - this.startTimeMs)
    this.currentStroke.isComplete = true
    this.strokes.push(this.currentStroke)
    this.currentStroke = null
    this.activePointerId = null

    this.recalculateScore()
    this.recordNormalizedEvent('pointerup', { x, y }, pointerId, checkOutOfBounds)

    // Avaliação de conclusão: score >= threshold ao soltar
    if (this.currentScore.overall >= this.completionThreshold) {
      this.completeGlyph()
      return true
    }

    // Levantamento inválido (score < threshold): comportamento depende do modo
    if (this.mode === 'strict_continuous') {
      // No modo estrito contínuo: reseta imediatamente
      this.performStrictReset()
    } else if (this.mode === 'timed_pause') {
      // No modo temporizado: entra em grace period
      this.enterGracePeriod()
    } else if (this.mode === 'free') {
      // No modo livre: preserva os traços e aguarda o próximo contato
      this.setState('ready')
    }

    return true
  }

  /** Trata interrupção do ponteiro (pointercancel). */
  public handlePointerCancel(pointerId: number): void {
    if (this.activePointerId !== pointerId) return
    this.handleInterruption('pointercancel', pointerId)
  }

  /** Trata perda de captura do ponteiro (lostpointercapture). */
  public handleLostPointerCapture(pointerId: number): void {
    if (this.activePointerId !== pointerId) return
    this.handleInterruption('lostpointercapture', pointerId)
  }

  private handleInterruption(
    eventType: 'pointercancel' | 'lostpointercapture',
    pointerId: number,
  ): void {
    if (this.isLocked || this.state === 'completed') return

    if (this.currentStroke) {
      this.currentStroke.endedAtMs = Math.round(this.now() - this.startTimeMs)
      this.currentStroke.isComplete = true
      this.strokes.push(this.currentStroke)
      this.currentStroke = null
    }

    this.activePointerId = null
    this.recordNormalizedEvent(eventType, { x: 0, y: 0 }, pointerId, false)

    if (this.currentScore.overall >= this.completionThreshold) {
      this.completeGlyph()
      return
    }

    if (this.mode === 'strict_continuous') {
      this.performStrictReset()
    } else if (this.mode === 'timed_pause') {
      this.enterGracePeriod()
    } else if (this.mode === 'free') {
      this.setState('ready')
    }
  }

  /** Conclui o glifo com sucesso e trava contra novas alterações. */
  private completeGlyph(): void {
    this.isLocked = true
    this.completedTimeMs = this.now()
    this.setState('completed')
    this.recordNormalizedEvent('complete', { x: 0, y: 0 }, 0, false)

    const evidence = this.getEvidence()
    this.onComplete?.(evidence)
  }

  /** Reseta imediatamente no modo estrito contínuo. */
  private performStrictReset(): void {
    this.cancelGraceTimer()
    this.strokes = []
    this.currentStroke = null
    this.currentScore = {
      coverage: 0,
      precision: 1,
      engagement: 0,
      overall: 0,
    }
    this.setState('reset')
    this.recordNormalizedEvent('reset', { x: 0, y: 0 }, 0, false)
    this.recordScoreSnapshot()
    this.onReset?.()
    this.onScoreChange?.(this.currentScore)

    // Retorna a ready para nova tentativa
    setTimeout(() => {
      if (this.state === 'reset') {
        this.setState('ready')
      }
    }, 150)
  }

  /** Inicia o período de carência no modo timed_pause. */
  private enterGracePeriod(): void {
    this.cancelGraceTimer()
    this.setState('grace')
    this.graceStartedAtMs = this.now()
    this.recordNormalizedEvent('grace_start', { x: 0, y: 0 }, 0, false)

    const startTime = this.graceStartedAtMs
    const totalMs = this.graceDurationMs

    this.onGraceTick?.(totalMs, totalMs)

    this.graceInterval = setInterval(() => {
      if (this.state !== 'grace') {
        this.cancelGraceTimer()
        return
      }
      const elapsed = this.now() - startTime
      const remaining = Math.max(0, totalMs - elapsed)
      this.onGraceTick?.(remaining, totalMs)
    }, 50)

    this.graceTimer = setTimeout(() => {
      if (this.state === 'grace') {
        this.graceExpirationsCount++
        this.recordNormalizedEvent('grace_expire', { x: 0, y: 0 }, 0, false)
        this.performStrictReset()
      }
    }, totalMs)
  }

  private cancelGraceTimer(): void {
    if (this.graceTimer !== null) {
      clearTimeout(this.graceTimer)
      this.graceTimer = null
    }
    if (this.graceInterval !== null) {
      clearInterval(this.graceInterval)
      this.graceInterval = null
    }
    this.graceStartedAtMs = null
  }

  /** Reseta manualmente o motor. */
  public reset(): void {
    this.cancelGraceTimer()
    this.isLocked = false
    this.activePointerId = null
    this.currentStroke = null
    this.strokes = []
    this.currentScore = {
      coverage: 0,
      precision: 1,
      engagement: 0,
      overall: 0,
    }
    this.startTimeMs = this.now()
    this.completedTimeMs = null
    this.outOfBoundsCount = 0
    this.graceExpirationsCount = 0
    this.setState('ready')
    this.recordNormalizedEvent('reset', { x: 0, y: 0 }, 0, false)
    this.recordScoreSnapshot()
    this.onReset?.()
    this.onScoreChange?.(this.currentScore)
  }

  /** Destrói timers e cancela inscrições ativas. */
  public destroy(): void {
    this.cancelGraceTimer()
  }

  /** Retorna o objeto de evidência serializável v1. */
  public getEvidence(): TracingEvidenceV1 {
    const endMs = this.completedTimeMs ?? this.now()
    const durationMs = Math.round(endMs - this.startTimeMs)

    return {
      schemaVersion: 'v1',
      sessionId: this.sessionId,
      glyphId: this.glyph.id,
      character: this.glyph.character,
      mode: this.mode,
      startedAt: new Date(Date.now() - durationMs).toISOString(),
      completedAt: this.completedTimeMs ? new Date().toISOString() : null,
      isCompleted: this.isLocked && this.state === 'completed',
      threshold: this.completionThreshold,
      finalScore: { ...this.currentScore },
      scoreHistory: [...this.scoreHistory],
      events: [...this.events],
      strokes: this.getStrokes(),
      outOfBoundsCount: this.outOfBoundsCount,
      graceExpirationsCount: this.graceExpirationsCount,
      durationMs,
    }
  }
}
