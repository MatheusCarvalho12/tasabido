/**
 * Motor de traçado determinístico e independente de framework (Ticket A1).
 * Implementa máquina de estados estrita/temporizada/livre, trava de ponteiro único,
 * pontuação v1 multiplicativa, eventos ordenados com seq monotônico e evidência serializável.
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
export const DEFAULT_COMPLETION_THRESHOLD = 0.7

export class TracingEngine {
  private readonly glyph: GlyphGeometry
  private readonly glyphIndex: number
  private readonly mode: TracingMode
  private readonly graceDurationMs: number
  private readonly completionThreshold: number
  private readonly sessionId: string
  private readonly clock: () => number

  private state: TracingState = 'ready'
  private isLocked = false
  private activePointerId: number | null = null
  private currentStroke: TracingStroke | null = null
  private segmentCounter = 0
  private eventSeq = 0

  /** Traços atualmente válidos no traçado ativo (usados para pontuação). */
  private activeStrokes: TracingStroke[] = []

  /** Histórico completo e preservado de todos os traços (para auditoria e replay). */
  private allStrokesHistory: TracingStroke[] = []

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
    this.glyphIndex = options.glyphIndex ?? 0
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
    return this.activeStrokes.map((s) => ({
      ...s,
      points: [...s.points],
    }))
  }

  public getAllStrokesHistory(): TracingStroke[] {
    return this.allStrokesHistory.map((s) => ({
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
    this.eventSeq++
    const event: TracingNormalizedEvent = {
      seq: this.eventSeq,
      glyphIndex: this.glyphIndex,
      segmentIndex: this.segmentCounter,
      type,
      point: {
        x: Math.round(point.x * 1000) / 1000,
        y: Math.round(point.y * 1000) / 1000,
      },
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
    const allStrokes = this.currentStroke
      ? [...this.activeStrokes, this.currentStroke]
      : this.activeStrokes
    const newScore = calculateLiveScore(allStrokes, this.glyph)

    const changed =
      newScore.overall !== this.currentScore.overall ||
      newScore.coverage !== this.currentScore.coverage ||
      newScore.precision !== this.currentScore.precision ||
      newScore.engagement !== this.currentScore.engagement

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
    this.segmentCounter++

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
      id: `stroke_${this.glyphIndex}_${this.segmentCounter}_${Math.round(startTimestamp)}`,
      glyphIndex: this.glyphIndex,
      segmentIndex: this.segmentCounter,
      points: [firstPoint],
      startedAtMs: Math.round(startTimestamp - this.startTimeMs),
      endedAtMs: null,
      isComplete: false,
      status: 'active',
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
   * Processa o levantamento voluntário do ponteiro (pointerup).
   * A conclusão SÓ ocorre quando o ponteiro é solto voluntariamente com score >= threshold.
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
    this.currentStroke.status = 'completed'
    this.activeStrokes.push(this.currentStroke)
    this.allStrokesHistory.push(this.currentStroke)
    this.currentStroke = null
    this.activePointerId = null

    this.recalculateScore()
    this.recordNormalizedEvent('pointerup', { x, y }, pointerId, checkOutOfBounds)

    // Avaliação de conclusão: score >= threshold ao soltar voluntariamente
    if (this.currentScore.overall >= this.completionThreshold) {
      this.completeGlyph()
      return true
    }

    // Levantamento incompleto (score < threshold): comportamento depende do modo
    if (this.mode === 'strict_continuous') {
      this.performStrictReset()
    } else if (this.mode === 'timed_pause') {
      this.enterGracePeriod()
    } else if (this.mode === 'free') {
      this.setState('ready')
    }

    return true
  }

  /**
   * Trata interrupção do ponteiro (pointercancel).
   * Interrupções são SEMPRE não-conclusivas (nunca completam glifo).
   */
  public handlePointerCancel(pointerId: number): void {
    if (this.activePointerId !== pointerId) return
    this.handleInterruption('pointercancel', pointerId)
  }

  /**
   * Trata perda de captura do ponteiro (lostpointercapture).
   * Interrupções são SEMPRE não-conclusivas (nunca completam glifo).
   */
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
      this.currentStroke.status = 'interrupted'
      this.allStrokesHistory.push(this.currentStroke)
      this.activeStrokes.push(this.currentStroke)
      this.currentStroke = null
    }

    this.activePointerId = null
    this.recordNormalizedEvent(eventType, { x: 0, y: 0 }, pointerId, false)

    // NUNCA completa o glifo em cancelamento ou perda de captura
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

  /** Reseta imediatamente no modo estrito contínuo preservando histórico de replay. */
  private performStrictReset(): void {
    this.cancelGraceTimer()
    // Marca traços ativos como resetados no histórico antes de limpar o buffer ativo
    for (let i = 0; i < this.activeStrokes.length; i++) {
      this.activeStrokes[i].status = 'reset'
    }
    this.activeStrokes = []
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
    this.activeStrokes = []
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

  /** Destrói timers ativos. */
  public destroy(): void {
    this.cancelGraceTimer()
  }

  /** Registra abandono explícito e retorna o pacote de evidência parcial. */
  public abandon(): TracingEvidenceV1 {
    this.cancelGraceTimer()
    if (this.currentStroke) {
      this.currentStroke.endedAtMs = Math.round(this.now() - this.startTimeMs)
      this.currentStroke.status = 'abandoned'
      this.allStrokesHistory.push(this.currentStroke)
      this.currentStroke = null
    }
    this.recordNormalizedEvent('abandon', { x: 0, y: 0 }, 0, false)
    return this.getEvidence('abandoned')
  }

  /** Retorna o objeto de evidência serializável v1. */
  public getEvidence(
    explicitStatus?: 'completed' | 'abandoned' | 'in_progress',
  ): TracingEvidenceV1 {
    const endMs = this.completedTimeMs ?? this.now()
    const durationMs = Math.round(endMs - this.startTimeMs)

    let status: 'completed' | 'abandoned' | 'in_progress' = 'in_progress'
    if (explicitStatus) {
      status = explicitStatus
    } else if (this.isLocked && this.state === 'completed') {
      status = 'completed'
    }

    return {
      schemaVersion: 'v1',
      scoringVersion: 'v1',
      sessionId: this.sessionId,
      glyphId: this.glyph.id,
      character: this.glyph.character,
      glyphIndex: this.glyphIndex,
      mode: this.mode,
      status,
      startedAt: new Date(Date.now() - durationMs).toISOString(),
      completedAt: this.completedTimeMs ? new Date().toISOString() : null,
      isCompleted: status === 'completed',
      threshold: this.completionThreshold,
      finalScore: { ...this.currentScore },
      scoreHistory: [...this.scoreHistory],
      events: [...this.events],
      strokes: this.getAllStrokesHistory(),
      outOfBoundsCount: this.outOfBoundsCount,
      graceExpirationsCount: this.graceExpirationsCount,
      durationMs,
    }
  }
}
