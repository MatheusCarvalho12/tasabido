/**
 * Tipos e esquemas do motor de traçado (tracing engine).
 * Ticket A1: TypeScript independente de framework, evidência serializável v1.
 */

export interface Point {
  /** Coordenada normalizada no eixo X [0, 1]. */
  x: number
  /** Coordenada normalizada no eixo Y [0, 1]. */
  y: number
}

export interface TimestampedPoint extends Point {
  /** Timestamp relativo ao início da sessão ou epoch ms. */
  timestampMs: number
  /** Indica se o ponto foi capturado fora da caixa delimitadora do alvo. */
  isOutOfBounds?: boolean
  /** Pressão do ponteiro se suportada pelo hardware [0, 1]. */
  pressure?: number
}

/**
 * Modos de interação do motor de traçado:
 * - `strict_continuous`: exige traço contínuo. Soltar o ponteiro antes de atingir o limiar reseta imediatamente.
 * - `timed_pause`: permite soltar o ponteiro; preserva o progresso durante o período de carência (grace period). Ao expirar, reseta.
 * - `free`: traçado livre; acumula progresso através de múltiplos toques/contatos sem reset ao soltar.
 */
export type TracingMode = 'strict_continuous' | 'timed_pause' | 'free'

/**
 * Estados do autômato finito do traçado:
 * - `idle`: motor inicializado, aguardando início.
 * - `ready`: pronto para receber toques no glifo atual.
 * - `drawing`: criança está ativamente traçando na tela.
 * - `valid_touching`: limiar de sucesso atingido (score >= threshold), mas criança ainda está com o dedo na tela.
 * - `grace`: em modo timed_pause, ponteiro foi solto com score < threshold e contagem regressiva está ativa.
 * - `reset`: estado de reset (ao soltar em strict_continuous ou ao expirar o grace em timed_pause).
 * - `invalid`: desvio excessivo ou toque inválido registrado.
 * - `completed`: glifo concluído com sucesso ao soltar o ponteiro com score >= threshold. Glifo travado.
 */
export type TracingState =
  | 'idle'
  | 'ready'
  | 'drawing'
  | 'valid_touching'
  | 'grace'
  | 'reset'
  | 'invalid'
  | 'completed'

export type TracingEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'lostpointercapture'
  | 'grace_start'
  | 'grace_resume'
  | 'grace_expire'
  | 'reset'
  | 'complete'

/** Evento determinístico normalizado no fluxo de evidências. */
export interface TracingNormalizedEvent {
  type: TracingEventType
  point: Point
  timestampMs: number
  pointerId: number
  isOutOfBounds: boolean
  state: TracingState
  score: TracingScore
}

/** Traço individual (do pointerdown ao pointerup/cancel). */
export interface TracingStroke {
  id: string
  points: TimestampedPoint[]
  startedAtMs: number
  endedAtMs: number | null
  isComplete: boolean
  outOfBoundsCount: number
}

/**
 * Interface de pontuação ao vivo:
 * - `coverage`: proporção de pontos do alvo atingidos dentro da tolerância [0, 1].
 * - `precision`: quão próximo o traço permaneceu da linha guia [0, 1].
 * - `engagement`: continuidade temporal e suavidade de movimento [0, 1].
 * - `overall`: pontuação composta ponderada [0, 1].
 */
export interface TracingScore {
  coverage: number
  precision: number
  engagement: number
  overall: number
}

/** Geometria de um traço guia dentro do glifo. */
export interface GlyphStrokeGeometry {
  id: string
  /** Caminho SVG para renderização fiel da linha guia (ex: "M 10 90 L 50 10 L 90 90"). */
  pathData: string
  /** Pontos amostrados ao longo da linha central em coordenadas normalizadas [0, 1]. */
  samplePoints: Point[]
  /** Ponto de partida sugerido para o traço [0, 1]. */
  startPoint: Point
  /** Ponto final do traço [0, 1]. */
  endPoint: Point
  /** Ordem sequencial do traço se houver múltiplos traços. */
  order?: number
}

/** Definição de geometria canônica de um glifo (letra/acento). */
export interface GlyphGeometry {
  id: string
  character: string
  label: string
  viewBox: string
  /** Raio de tolerância do corredor em coordenadas normalizadas [0, 1]. */
  toleranceRadius: number
  strokes: GlyphStrokeGeometry[]
  /** Limiar de pontuação geral para conclusão [0, 1], ex: 0.8. */
  completionThreshold: number
}

/**
 * Esquema de evidência serializável v1.
 * Contém o histórico completo, fluxo de eventos determinísticos e métricas.
 */
export interface TracingEvidenceV1 {
  schemaVersion: 'v1'
  sessionId: string
  glyphId: string
  character: string
  mode: TracingMode
  startedAt: string
  completedAt: string | null
  isCompleted: boolean
  threshold: number
  finalScore: TracingScore
  scoreHistory: Array<{ timestampMs: number; score: TracingScore }>
  events: TracingNormalizedEvent[]
  strokes: TracingStroke[]
  outOfBoundsCount: number
  graceExpirationsCount: number
  durationMs: number
  metadata?: Record<string, unknown>
}

/** Opções de configuração do motor de traçado. */
export interface TracingEngineOptions {
  glyph: GlyphGeometry
  mode?: TracingMode
  graceDurationMs?: number
  completionThreshold?: number
  sessionId?: string
  clock?: () => number
  onStateChange?: (state: TracingState, previousState: TracingState) => void
  onScoreChange?: (score: TracingScore) => void
  onGraceTick?: (remainingMs: number, totalMs: number) => void
  onComplete?: (evidence: TracingEvidenceV1) => void
  onReset?: () => void
}
