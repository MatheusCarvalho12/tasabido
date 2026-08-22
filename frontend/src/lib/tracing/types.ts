/**
 * Tipos e esquemas do motor de traçado (tracing engine) e configurações profissionais/adultas.
 * Tickets A1-A5: TypeScript independente de framework, evidência v1, limites de API autoritativos.
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
 * - `invalid`: desvio excessivo ou toque fora dos limites registrado.
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
  | 'abandon'

/** Evento determinístico normalizado no fluxo de evidências do frontend. */
export interface TracingNormalizedEvent {
  seq: number
  glyphIndex: number
  segmentIndex: number
  type: TracingEventType
  point: Point
  timestampMs: number
  pointerId: number
  isOutOfBounds: boolean
  state: TracingState
  score: TracingScore
}

/** Status do traço individual. */
export type StrokeStatus = 'active' | 'completed' | 'reset' | 'interrupted' | 'abandoned'

/** Traço individual (do pointerdown ao pointerup/cancel/reset). */
export interface TracingStroke {
  id: string
  glyphIndex: number
  segmentIndex: number
  points: TimestampedPoint[]
  startedAtMs: number
  endedAtMs: number | null
  isComplete: boolean
  status: StrokeStatus
  outOfBoundsCount: number
}

/**
 * Interface de pontuação ao vivo:
 * - `coverage`: proporção de pontos/extensão do alvo atingidos dentro da tolerância [0, 1].
 * - `precision`: proporção de traço dentro do corredor sobre o total desenhado [0, 1].
 * - `engagement`: valid trace length / (target length * 0.25), limitado a 1.0 [0, 1].
 * - `overall`: coverage * precision * engagement [0, 1] (fórmula multiplicativa congelada v1).
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
  /** Comprimento do traço da linha guia no espaço normalizado [0, 1]. */
  length: number
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
  /** Comprimento total somado de todos os traços do glifo no espaço [0, 1]. */
  totalTargetLength: number
  /** Limiar de pontuação geral para conclusão [0, 1], padrão exato 0.70. */
  completionThreshold: number
}

/**
 * Esquema de evidência serializável v1 do frontend.
 */
export interface TracingEvidenceV1 {
  schemaVersion: 'v1'
  scoringVersion: 'v1'
  glyphSetId: string
  glyphSetVersion: string
  glyphSetHash: string
  sessionId: string
  glyphId: string
  character: string
  glyphIndex: number
  mode: TracingMode
  status: 'completed' | 'abandoned' | 'in_progress'
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

/** Pacote de evidência de sessão do frontend. */
export interface TracingSessionEvidenceV1 {
  schemaVersion: 'v1'
  scoringVersion: 'v1'
  glyphSetId: string
  glyphSetVersion: string
  glyphSetHash: string
  sessionId: string
  childName: string
  mode: TracingMode
  status: 'completed' | 'abandoned'
  startedAt: string
  completedAt: string | null
  durationMs: number
  glyphs: TracingEvidenceV1[]
}

/** Opções de configuração do motor de traçado. */
export interface TracingEngineOptions {
  glyph: GlyphGeometry
  glyphIndex?: number
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

// --------------------------------------------------------------------------
// Contrato Backend (Ticket A5 - /api/tracing-runs)
// --------------------------------------------------------------------------

export type BackendContactMode = 'strict_continuous' | 'timed_pause' | 'free'
export type BackendRunTraceStatus = 'started' | 'completed' | 'abandoned' | 'legacy'
export type BackendTraceEventType = 'down' | 'move' | 'up' | 'cancel' | 'reset' | 'grace_expire'
export type BackendSegmentStatus = 'open' | 'completed' | 'cancelled' | 'reset' | 'grace_expired'
export type BackendGlyphTraceStatus = 'pending' | 'completed' | 'abandoned' | 'invalid'

export interface BackendTraceEvent {
  seq: number
  type: BackendTraceEventType
  pointer_id: number
  x_norm: number | null
  y_norm: number | null
  t_ms: number
  in_bounds: boolean
  glyph_index: number
  segment_index: number
}

export interface BackendTraceSegmentEvidence {
  segment_index: number
  glyph_index: number
  pointer_id: number
  status: BackendSegmentStatus
  started_at_ms: number
  ended_at_ms: number
  event_seqs: number[]
  points: Array<[number, number]>
  in_bounds: boolean[]
}

export interface BackendGlyphTraceEvidence {
  glyph_index: number
  grapheme: string
  status: BackendGlyphTraceStatus
  segments: BackendTraceSegmentEvidence[]
  score: number
  coverage: number
  precision: number
  engagement: number
}

export interface BackendTraceScore {
  score: number
  coverage: number
  precision: number
  engagement: number
  completed: boolean
  valid_trace_length?: number
  target_length?: number
}

export interface BackendTraceEvidence {
  schema_version?: number
  scoring_version?: number
  glyph_set_id?: number | null
  glyph_set_version?: string | null
  glyph_set_sha256?: string | null
  artifact_version: string
  artifact_sha256: string
  pause_grace_ms: number
  events: BackendTraceEvent[]
  glyphs: BackendGlyphTraceEvidence[]
  status: 'completed' | 'abandoned'
  score?: BackendTraceScore | null
}

export interface BackendGlyphSetCatalogOut {
  id: number
  version: string
  artifact_sha256: string
  sha256: string
  artifact_path: string
  style: string
  geometry: Record<string, number[][][]>
  immutable: boolean
}

export interface BackendGlyphSetCatalogResponse {
  items: BackendGlyphSetCatalogOut[]
}

export interface BackendGameDefaultsOut {
  game_id: number
  threshold: number
  contact_mode: TracingMode
  pause_grace_ms: number
  glyph_set_id: number
  glyph_set_version: string
  glyph_set_sha256: string
  scoring_version: number
  schema_version: number
  created_at: string
  updated_at: string
}

export interface BackendGameTracingConfigPatch {
  glyph_set_id?: number
  threshold?: number
  contact_mode?: TracingMode
  pause_grace_ms?: number
}

export interface BackendAssignmentTracingConfigOut {
  assignment_id: number
  game_id: number
  child_id: string
  glyph_set_id_override: number | null
  threshold_override: number | null
  contact_mode_override: TracingMode | null
  pause_grace_ms_override: number | null
}

export interface BackendAssignmentTraceOverrides {
  glyph_set_id_override?: number | null
  threshold_override?: number | null
  contact_mode_override?: TracingMode | null
  pause_grace_ms_override?: number | null
}

export interface BackendLinkedAssignmentOut {
  assignment_id: number
  game_id: number
}

export interface BackendLinkedChildOut {
  child_id: string
  name: string
  assignments: BackendLinkedAssignmentOut[]
}

export interface BackendLinkedChildrenResponse {
  items: BackendLinkedChildOut[]
}

export interface BackendTracingRunStartRequest {
  child_id: string
  assignment_id?: number | null
}

export interface BackendTracingRunFinalizeRequest {
  idempotency_key: string
  evidence: BackendTraceEvidence
}

export interface BackendTracingRunOut {
  id: number
  game_id: number
  child_id: string
  status: BackendRunTraceStatus
  score: number | null
  duration_seconds: number | null
  glyph_set_id: number | null
  glyph_set_version: string | null
  glyph_set_sha256: string | null
  threshold: number | null
  contact_mode: TracingMode | null
  pause_grace_ms: number | null
  scoring_version: number | null
  schema_version: number | null
  effective_config: Record<string, unknown>
  glyph_sequence: string[]
  glyphs?: BackendGlyphTraceEvidence[]
  evidence_sha256?: string | null
  evidence_version?: number | null
  evidence?: BackendTraceEvidence | null
  glyph_set?: BackendGlyphSetCatalogOut | null
  started_at?: string | null
  completed_at?: string | null
  last_activity_at?: string | null
}

export interface BackendTracingRunListResponse {
  items: BackendTracingRunOut[]
  limit: number
  offset: number
  has_more: boolean
}

// --------------------------------------------------------------------------
// Configurações do Jogo de Traçado (Ticket A4 / A5)
// --------------------------------------------------------------------------

/** Definição de um conjunto completo e atômico de glifos. */
export interface GlyphSetDefinition {
  id: string
  name: string
  version: string
  hash: string
  description: string
  glyphCount: number
  glyphs: readonly string[]
  numericId?: number
  geometry?: Record<string, number[][][]>
}

export const CANONICAL_GLYPH_SET_ID = 'maiusculas-bloco-v1'
export const CANONICAL_GLYPH_SET_VERSION = 'uppercase-block-v1'
export const CANONICAL_GLYPH_SET_HASH =
  'sha256:7f9a1c4e2b8d0e3f5a6c8e9b0d1f2a3c4e5b6d7e8f9a0b1c2d3e4f5a6b7c8d9e'

/**
 * Conjuntos de glifos conhecidos pelo frontend para catálogo estático inicial e preview.
 * Na integração A5, o backend fornece o catálogo autoritativo via GET /api/tracing-runs/glyph-sets.
 */
export const IMMUTABLE_GLYPH_SETS: Record<string, GlyphSetDefinition> = {
  [CANONICAL_GLYPH_SET_ID]: {
    id: CANONICAL_GLYPH_SET_ID,
    name: 'Maiúsculas bloco',
    version: CANONICAL_GLYPH_SET_VERSION,
    hash: CANONICAL_GLYPH_SET_HASH,
    description:
      'Conjunto completo de 39 caracteres maiúsculos em letra de forma (A-Z e acentos pt-BR: Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç, Ü).',
    glyphCount: 39,
    numericId: 1,
    glyphs: [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'N',
      'O',
      'P',
      'Q',
      'R',
      'S',
      'T',
      'U',
      'V',
      'W',
      'X',
      'Y',
      'Z',
      'Á',
      'À',
      'Â',
      'Ã',
      'É',
      'Ê',
      'Í',
      'Ó',
      'Ô',
      'Õ',
      'Ú',
      'Ç',
      'Ü',
    ],
  },
}

/** Configuração base de comportamento de traçado do jogo. */
export interface TracingGameConfig {
  /** Identificador do conjunto de glifos atômico (ex: 'maiusculas-bloco-v1' ou '1'). */
  glyphSetId: string
  /** Versão semântica do conjunto de glifos (ex: '1.0.0'). */
  glyphSetVersion: string
  /** Hash criptográfico SHA-256 do conjunto de glifos. */
  glyphSetHash: string
  /** Modo de contato: Contínuo estrito | Pausa com prazo | Livre */
  mode: TracingMode
  /** Limiar de pontuação para conclusão (0-100, padrão 70). */
  completionThreshold: number
  /** Prazo de pausa em segundos (0, 1, 1.5, 2, 3; padrão 1.5s). */
  graceDurationSeconds: number
  /** ID numérico do conjunto de glifos no backend (A5). */
  numericGlyphSetId?: number
}

/** Configuração padrão do jogo de traçado. */
export const DEFAULT_TRACING_GAME_CONFIG: TracingGameConfig = {
  glyphSetId: CANONICAL_GLYPH_SET_ID,
  glyphSetVersion: CANONICAL_GLYPH_SET_VERSION,
  glyphSetHash: CANONICAL_GLYPH_SET_HASH,
  mode: 'timed_pause',
  completionThreshold: 70,
  graceDurationSeconds: 1.5,
  numericGlyphSetId: 1,
}

/** Sobrescreve parâmetros de traçado por atribuição individual à criança. */
export interface TracingAssignmentOverride {
  childId: string
  childName: string
  gameId: number
  assignmentId?: number
  /** null indica que herda o conjunto padrão do jogo. */
  glyphSetId: string | null
  /** null indica que herda o modo padrão do jogo. */
  mode: TracingMode | null
  /** null indica que herda o limiar padrão do jogo (0-100). */
  completionThreshold: number | null
  /** null indica que herda o prazo de pausa padrão do jogo. */
  graceDurationSeconds: number | null
  numericGlyphSetId?: number | null
}

/** Configuração efetiva resultante da herança + overrides. */
export interface TracingEffectiveSettings {
  glyphSetId: string
  glyphSetVersion: string
  glyphSetHash: string
  mode: TracingMode
  completionThreshold: number
  graceDurationSeconds: number
  isOverridden: {
    glyphSetId: boolean
    mode: boolean
    completionThreshold: boolean
    graceDurationSeconds: boolean
  }
}

/**
 * Calcula as configurações efetivas de traçado combinando o padrão do jogo com overrides da criança.
 */
export function resolveEffectiveTracingSettings(
  gameConfig: TracingGameConfig = DEFAULT_TRACING_GAME_CONFIG,
  override?: TracingAssignmentOverride | null,
): TracingEffectiveSettings {
  const effectiveGlyphSetId = override?.glyphSetId ?? gameConfig.glyphSetId
  const fallbackSet: GlyphSetDefinition = {
    id: CANONICAL_GLYPH_SET_ID,
    name: 'Maiúsculas bloco',
    version: CANONICAL_GLYPH_SET_VERSION,
    hash: CANONICAL_GLYPH_SET_HASH,
    description: 'Conjunto canônico de letras maiúsculas de forma.',
    glyphCount: 39,
    glyphs: [],
  }

  const effectiveSetDef =
    IMMUTABLE_GLYPH_SETS[effectiveGlyphSetId] ??
    IMMUTABLE_GLYPH_SETS[DEFAULT_TRACING_GAME_CONFIG.glyphSetId] ??
    fallbackSet

  if (!override) {
    return {
      glyphSetId: gameConfig.glyphSetId,
      glyphSetVersion: gameConfig.glyphSetVersion,
      glyphSetHash: gameConfig.glyphSetHash,
      mode: gameConfig.mode,
      completionThreshold: gameConfig.completionThreshold,
      graceDurationSeconds: gameConfig.graceDurationSeconds,
      isOverridden: {
        glyphSetId: false,
        mode: false,
        completionThreshold: false,
        graceDurationSeconds: false,
      },
    }
  }

  return {
    glyphSetId: effectiveGlyphSetId,
    glyphSetVersion: effectiveSetDef.version,
    glyphSetHash: effectiveSetDef.hash,
    mode: override.mode ?? gameConfig.mode,
    completionThreshold: override.completionThreshold ?? gameConfig.completionThreshold,
    graceDurationSeconds: override.graceDurationSeconds ?? gameConfig.graceDurationSeconds,
    isOverridden: {
      glyphSetId: override.glyphSetId !== null,
      mode: override.mode !== null,
      completionThreshold: override.completionThreshold !== null,
      graceDurationSeconds: override.graceDurationSeconds !== null,
    },
  }
}

// --------------------------------------------------------------------------
// Mapeadores e Transformações de Eventos Frontend -> Backend (A5)
// --------------------------------------------------------------------------

export function transformFrontendEventsToBackend(
  events: TracingNormalizedEvent[],
): BackendTraceEvent[] {
  return events.map((event) => {
    let backendType: BackendTraceEventType
    let xNorm: number | null = event.point.x
    let yNorm: number | null = event.point.y

    switch (event.type) {
      case 'pointerdown':
        backendType = 'down'
        break
      case 'pointermove':
        backendType = 'move'
        break
      case 'pointerup':
        backendType = 'up'
        break
      case 'pointercancel':
      case 'lostpointercapture':
        backendType = 'cancel'
        xNorm = null
        yNorm = null
        break
      case 'reset':
        backendType = 'reset'
        xNorm = null
        yNorm = null
        break
      case 'grace_expire':
        backendType = 'grace_expire'
        xNorm = null
        yNorm = null
        break
      default:
        backendType = 'move'
        break
    }

    return {
      seq: event.seq,
      type: backendType,
      pointer_id: Math.max(0, event.pointerId),
      x_norm: xNorm,
      y_norm: yNorm,
      t_ms: Math.max(0, Math.round(event.timestampMs)),
      in_bounds: !event.isOutOfBounds,
      glyph_index: event.glyphIndex,
      segment_index: event.segmentIndex,
    }
  })
}

export function transformFrontendEvidencesToBackend(
  allEvents: TracingNormalizedEvent[],
  glyphEvidences: TracingEvidenceV1[],
  glyphSequence: string[],
  runConfig: {
    glyphSetId?: number | null
    glyphSetVersion: string
    glyphSetSha256: string
    pauseGraceMs: number
  },
  overallStatus: 'completed' | 'abandoned',
): BackendTraceEvidence {
  const backendEvents = transformFrontendEventsToBackend(allEvents)

  const glyphs: BackendGlyphTraceEvidence[] = glyphSequence.map((grapheme, idx) => {
    const evidence = glyphEvidences.find((g) => g.glyphIndex === idx)
    if (!evidence) {
      return {
        glyph_index: idx,
        grapheme,
        status: 'pending',
        segments: [],
        score: 0,
        coverage: 0,
        precision: 0,
        engagement: 0,
      }
    }

    const segments: BackendTraceSegmentEvidence[] = evidence.strokes.map((s, sIdx) => ({
      segment_index: s.segmentIndex ?? sIdx,
      glyph_index: s.glyphIndex ?? idx,
      pointer_id: 1,
      status: s.status === 'completed' ? 'completed' : 'cancelled',
      started_at_ms: Math.max(0, Math.round(s.startedAtMs)),
      ended_at_ms: Math.max(0, Math.round(s.endedAtMs ?? s.startedAtMs)),
      event_seqs: [],
      points: s.points.map((p) => [p.x, p.y]),
      in_bounds: s.points.map((p) => !p.isOutOfBounds),
    }))

    return {
      glyph_index: idx,
      grapheme,
      status: evidence.status === 'completed' ? 'completed' : 'abandoned',
      segments,
      score: Math.round(evidence.finalScore.overall * 100),
      coverage: evidence.finalScore.coverage,
      precision: evidence.finalScore.precision,
      engagement: evidence.finalScore.engagement,
    }
  })

  return {
    schema_version: 1,
    scoring_version: 1,
    glyph_set_id: runConfig.glyphSetId ?? null,
    glyph_set_version: runConfig.glyphSetVersion,
    glyph_set_sha256: runConfig.glyphSetSha256,
    artifact_version: runConfig.glyphSetVersion,
    artifact_sha256: runConfig.glyphSetSha256,
    pause_grace_ms: runConfig.pauseGraceMs,
    events: backendEvents,
    glyphs,
    status: overallStatus,
  }
}
