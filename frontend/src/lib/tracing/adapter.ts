/**
 * Adaptadores de API e persistência de sessões de traçado (Ticket A5).
 * Integração real autoritativa sob o prefixo /api/tracing-runs.
 * Mapeia schemas snake_case do backend FastAPI para modelos do frontend.
 */

import { ApiRequestError, apiClient } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { ApiErrorBody } from '@/types/auth'
import type {
  BackendAssignmentTraceOverrides,
  BackendAssignmentTracingConfigOut,
  BackendGameDefaultsOut,
  BackendGameTracingConfigPatch,
  BackendGlyphSetCatalogResponse,
  BackendLinkedChildOut,
  BackendLinkedChildrenResponse,
  BackendTracingRunFinalizeRequest,
  BackendTracingRunListResponse,
  BackendTracingRunOut,
  BackendTracingRunStartRequest,
  TracingAssignmentOverride,
  TracingGameConfig,
} from './types'

const TRANSIENT_EVIDENCE_KEY = 'tasabido.tracing_transient'

export interface TracingRunSubmissionResult {
  success: boolean
  mode: 'authoritative_api' | 'transient_fallback'
  sessionId: string
  status: 'completed' | 'abandoned'
  synced: boolean
  message: string
  run?: BackendTracingRunOut
}

export type LinkedChild = BackendLinkedChildOut

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// --------------------------------------------------------------------------
// 1. Catálogo de Conjuntos de Glifos (/api/tracing-runs/glyph-sets)
// --------------------------------------------------------------------------

/**
 * Busca o catálogo oficial de conjuntos de glifos ativos e imutáveis do servidor.
 */
export async function fetchGlyphSetsCatalogApi(): Promise<BackendGlyphSetCatalogResponse> {
  const { data, error, response } = await apiClient.get<
    BackendGlyphSetCatalogResponse,
    ApiErrorBody
  >({
    url: '/api/tracing-runs/glyph-sets',
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar o catálogo de conjuntos de letras.',
    )
  }
  return data
}

// --------------------------------------------------------------------------
// 2. Configurações Padrão de Traçado do Jogo (/api/tracing-runs/config/{game_id})
// --------------------------------------------------------------------------

/**
 * Busca as configurações padrão de traçado associadas a um jogo específico.
 */
export async function fetchGameTracingConfigApi(gameId: number): Promise<BackendGameDefaultsOut> {
  const { data, error, response } = await apiClient.get<BackendGameDefaultsOut, ApiErrorBody>({
    url: `/api/tracing-runs/config/${gameId}`,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível obter a configuração de traçado do jogo.',
    )
  }
  return data
}

/**
 * Atualiza parcialmente as configurações padrão de traçado de um jogo do profissional.
 */
export async function updateGameTracingConfigApi(
  gameId: number,
  patch: BackendGameTracingConfigPatch,
): Promise<BackendGameDefaultsOut> {
  const { data, error, response } = await apiClient.patch<BackendGameDefaultsOut, ApiErrorBody>({
    url: `/api/tracing-runs/config/${gameId}`,
    body: patch,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível atualizar as configurações de traçado do jogo.',
    )
  }
  return data
}

// --------------------------------------------------------------------------
// 3. Overrides por Atribuição Individual (/api/tracing-runs/assignments/{assignment_id})
// --------------------------------------------------------------------------

/**
 * Busca os overrides de traçado de uma atribuição específica.
 */
export async function fetchAssignmentTracingConfigApi(
  assignmentId: number,
): Promise<BackendAssignmentTracingConfigOut> {
  const { data, error, response } = await apiClient.get<
    BackendAssignmentTracingConfigOut,
    ApiErrorBody
  >({
    url: `/api/tracing-runs/assignments/${assignmentId}`,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar as personalizações da atribuição.',
    )
  }
  return data
}

/**
 * Atualiza os overrides de traçado de uma atribuição individual à criança.
 */
export async function updateAssignmentTracingConfigApi(
  assignmentId: number,
  patch: BackendAssignmentTraceOverrides,
): Promise<BackendAssignmentTracingConfigOut> {
  const { data, error, response } = await apiClient.patch<
    BackendAssignmentTracingConfigOut,
    ApiErrorBody
  >({
    url: `/api/tracing-runs/assignments/${assignmentId}`,
    body: patch,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível salvar as personalizações para a criança.',
    )
  }
  return data
}

// --------------------------------------------------------------------------
// 4. Crianças Vinculadas com Atribuições (/api/tracing-runs/children)
// --------------------------------------------------------------------------

/**
 * Busca a lista real de crianças vinculadas ao profissional e suas atribuições de jogos.
 */
export async function fetchLinkedChildrenApi(): Promise<BackendLinkedChildOut[]> {
  const { data, error, response } = await apiClient.get<
    BackendLinkedChildrenResponse,
    ApiErrorBody
  >({
    url: '/api/tracing-runs/children',
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar a lista de crianças vinculadas.',
    )
  }
  return data.items
}

// --------------------------------------------------------------------------
// 5. Listagem de Partidas Registradas (/api/tracing-runs)
// --------------------------------------------------------------------------

export interface ListTracingRunsParams {
  childId?: string
  gameId?: number
  limit?: number
  offset?: number
}

/**
 * Lista as partidas autorizadas registradas no servidor para o usuário autenticado (família ou profissional).
 */
export async function fetchTracingRunsListApi(
  params?: ListTracingRunsParams,
): Promise<BackendTracingRunOut[]> {
  const query: Record<string, string | number> = {}
  if (params?.childId) query.child_id = params.childId
  if (params?.gameId) query.game_id = params.gameId
  if (params?.limit) query.limit = params.limit
  if (params?.offset) query.offset = params.offset

  const { data, error, response } = await apiClient.get<
    BackendTracingRunListResponse,
    ApiErrorBody
  >({
    url: '/api/tracing-runs',
    query,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível listar as partidas de traçado.',
    )
  }
  return data.items
}

// --------------------------------------------------------------------------
// 6. Início e Finalização de Partida (/api/tracing-runs/start e /{run_id}/finalize)
// --------------------------------------------------------------------------

/**
 * Inicia uma partida de traçado autoritativa no servidor.
 * Retorna as configurações efetivas, sequência de glifos e geometria exata do backend.
 */
export async function startTracingRunApi(
  payload: BackendTracingRunStartRequest,
): Promise<BackendTracingRunOut> {
  const { data, error, response } = await apiClient.post<BackendTracingRunOut, ApiErrorBody>({
    url: '/api/tracing-runs/start',
    body: payload,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível iniciar a sessão de traçado.',
    )
  }
  return data
}

/**
 * Finaliza uma partida de traçado enviando a evidência completa v1 e chave de idempotência.
 * O servidor executa o replay canônico e calcula a pontuação autoritativa.
 */
export async function finalizeTracingRunApi(
  runId: number,
  payload: BackendTracingRunFinalizeRequest,
): Promise<BackendTracingRunOut> {
  const { data, error, response } = await apiClient.post<BackendTracingRunOut, ApiErrorBody>({
    url: `/api/tracing-runs/${runId}/finalize`,
    body: payload,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível finalizar a sessão de traçado.',
    )
  }

  // Limpa evidências transitórias locais após sincronização autoritativa bem-sucedida
  clearTransientEvidence()

  return data
}

// --------------------------------------------------------------------------
// 7. Detalhes e Replay de Partida (/api/tracing-runs/{run_id} e /{run_id}/replay)
// --------------------------------------------------------------------------

/**
 * Busca o resumo de uma partida de traçado pelo runId.
 */
export async function fetchTracingRunDetailApi(runId: number): Promise<BackendTracingRunOut> {
  const { data, error, response } = await apiClient.get<BackendTracingRunOut, ApiErrorBody>({
    url: `/api/tracing-runs/${runId}`,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível obter o detalhe da partida.',
    )
  }
  return data
}

/**
 * Busca a evidência completa e geometria para reprodução/auditoria de replay fiel.
 */
export async function fetchTracingRunReplayApi(runId: number): Promise<BackendTracingRunOut> {
  const { data, error, response } = await apiClient.get<BackendTracingRunOut, ApiErrorBody>({
    url: `/api/tracing-runs/${runId}/replay`,
    headers: authHeaders(),
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar os dados de replay da partida.',
    )
  }
  return data
}

// --------------------------------------------------------------------------
// 8. Gestão de Evidência Transitória Local (Apenas durante a sessão ativa)
// --------------------------------------------------------------------------

export function saveTransientEvidence(key: string, data: unknown): void {
  try {
    window.sessionStorage.setItem(`${TRANSIENT_EVIDENCE_KEY}_${key}`, JSON.stringify(data))
  } catch {
    // Silencioso
  }
}

export function getTransientEvidence<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(`${TRANSIENT_EVIDENCE_KEY}_${key}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearTransientEvidence(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key?.startsWith(TRANSIENT_EVIDENCE_KEY)) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      window.sessionStorage.removeItem(key)
    }
  } catch {
    // Silencioso
  }
}

// --------------------------------------------------------------------------
// Mapeadores de compatibilidade com interfaces anteriores (A4)
// --------------------------------------------------------------------------

export async function fetchTracingGameConfigApi(gameId: number): Promise<TracingGameConfig> {
  try {
    const defaults = await fetchGameTracingConfigApi(gameId)
    return {
      glyphSetId: String(defaults.glyph_set_id),
      glyphSetVersion: defaults.glyph_set_version,
      glyphSetHash: defaults.glyph_set_sha256,
      mode: defaults.contact_mode,
      completionThreshold: defaults.threshold,
      graceDurationSeconds: defaults.pause_grace_ms / 1000,
      numericGlyphSetId: defaults.glyph_set_id,
    }
  } catch {
    return {
      glyphSetId: '1',
      glyphSetVersion: 'uppercase-block-v1',
      glyphSetHash: '',
      mode: 'timed_pause',
      completionThreshold: 70,
      graceDurationSeconds: 1.5,
      numericGlyphSetId: 1,
    }
  }
}

export async function saveTracingGameConfigApi(
  gameId: number,
  config: TracingGameConfig,
): Promise<TracingGameConfig> {
  const glyphSetIdNumber = config.numericGlyphSetId ?? Number.parseInt(config.glyphSetId, 10)
  const patch: BackendGameTracingConfigPatch = {
    glyph_set_id: Number.isNaN(glyphSetIdNumber) ? undefined : glyphSetIdNumber,
    threshold: config.completionThreshold,
    contact_mode: config.mode,
    pause_grace_ms: Math.round(config.graceDurationSeconds * 1000),
  }
  const updated = await updateGameTracingConfigApi(gameId, patch)
  return {
    glyphSetId: String(updated.glyph_set_id),
    glyphSetVersion: updated.glyph_set_version,
    glyphSetHash: updated.glyph_set_sha256,
    mode: updated.contact_mode,
    completionThreshold: updated.threshold,
    graceDurationSeconds: updated.pause_grace_ms / 1000,
    numericGlyphSetId: updated.glyph_set_id,
  }
}

export async function fetchChildAssignmentOverrideApi(
  _childId: string,
  _gameId: number,
  assignmentId?: number,
): Promise<TracingAssignmentOverride | null> {
  if (!assignmentId) {
    return null
  }
  try {
    const config = await fetchAssignmentTracingConfigApi(assignmentId)
    return {
      childId: config.child_id,
      childName: '',
      gameId: config.game_id,
      assignmentId: config.assignment_id,
      glyphSetId:
        config.glyph_set_id_override !== null ? String(config.glyph_set_id_override) : null,
      mode: config.contact_mode_override,
      completionThreshold: config.threshold_override,
      graceDurationSeconds:
        config.pause_grace_ms_override !== null ? config.pause_grace_ms_override / 1000 : null,
      numericGlyphSetId: config.glyph_set_id_override,
    }
  } catch {
    return null
  }
}

export async function saveChildAssignmentOverrideApi(
  override: TracingAssignmentOverride,
): Promise<TracingAssignmentOverride> {
  if (!override.assignmentId) {
    return override
  }
  const glyphSetIdNumber =
    override.numericGlyphSetId ??
    (override.glyphSetId ? Number.parseInt(override.glyphSetId, 10) : null)

  const patch: BackendAssignmentTraceOverrides = {
    glyph_set_id_override:
      glyphSetIdNumber !== null && !Number.isNaN(glyphSetIdNumber) ? glyphSetIdNumber : null,
    threshold_override: override.completionThreshold,
    contact_mode_override: override.mode,
    pause_grace_ms_override:
      override.graceDurationSeconds !== null
        ? Math.round(override.graceDurationSeconds * 1000)
        : null,
  }
  const updated = await updateAssignmentTracingConfigApi(override.assignmentId, patch)
  return {
    ...override,
    glyphSetId:
      updated.glyph_set_id_override !== null ? String(updated.glyph_set_id_override) : null,
    mode: updated.contact_mode_override,
    completionThreshold: updated.threshold_override,
    graceDurationSeconds:
      updated.pause_grace_ms_override !== null ? updated.pause_grace_ms_override / 1000 : null,
    numericGlyphSetId: updated.glyph_set_id_override,
  }
}

export async function resetChildAssignmentOverrideApi(
  _childId: string,
  _gameId: number,
  assignmentId?: number,
): Promise<void> {
  if (!assignmentId) return
  await updateAssignmentTracingConfigApi(assignmentId, {
    glyph_set_id_override: null,
    threshold_override: null,
    contact_mode_override: null,
    pause_grace_ms_override: null,
  })
}
