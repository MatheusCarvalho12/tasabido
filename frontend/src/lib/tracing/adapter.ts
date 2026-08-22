/**
 * Adaptadores de API e persistência de sessões de traçado (Tickets A1-A4).
 * Limite tipado para integração A5 (/api/tracing-runs, /api/tracing-configs, /api/tracing-assignments).
 * Não envia scores não-autoritativos para endpoints legados nem inventa dados de runtime.
 */

import {
  DEFAULT_TRACING_GAME_CONFIG,
  type TracingAssignmentOverride,
  type TracingEvidenceV1,
  type TracingGameConfig,
  type TracingSessionEvidenceV1,
} from './types'

const EVIDENCE_STORAGE_KEY = 'tasabido.tracing_evidences'
const SESSION_EVIDENCE_STORAGE_KEY = 'tasabido.tracing_sessions'
const GAME_CONFIG_STORAGE_KEY = 'tasabido.tracing_game_configs'
const ASSIGNMENT_OVERRIDE_STORAGE_KEY = 'tasabido.tracing_assignment_overrides'

export interface TracingRunSubmissionResult {
  success: boolean
  mode: 'local_boundary'
  sessionId: string
  status: 'completed' | 'abandoned'
  synced: boolean
  message: string
}

export interface LinkedChild {
  id: string
  name: string
  age?: number
  avatarUrl?: string
}

/**
 * Salva a evidência de um glifo individual no sessionStorage.
 */
export function saveLocalEvidence(evidence: TracingEvidenceV1): void {
  try {
    const existing = window.sessionStorage.getItem(EVIDENCE_STORAGE_KEY)
    const list: TracingEvidenceV1[] = existing ? JSON.parse(existing) : []
    list.push(evidence)
    window.sessionStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Silencioso em caso de falha de storage
  }
}

/**
 * Salva o pacote completo da sessão (completa ou abandonada) no sessionStorage.
 */
export function saveSessionEvidence(session: TracingSessionEvidenceV1): void {
  try {
    const existing = window.sessionStorage.getItem(SESSION_EVIDENCE_STORAGE_KEY)
    const list: TracingSessionEvidenceV1[] = existing ? JSON.parse(existing) : []
    const filtered = list.filter((s) => s.sessionId !== session.sessionId)
    filtered.push(session)
    window.sessionStorage.setItem(SESSION_EVIDENCE_STORAGE_KEY, JSON.stringify(filtered))
  } catch {
    // Silencioso
  }
}

/**
 * Recupera todas as sessões salvas localmente.
 * Retorna [] quando não há sessões armazenadas (sem dados falsos/inventados).
 */
export function getLocalSessionEvidences(): TracingSessionEvidenceV1[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_EVIDENCE_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (Array.isArray(list)) {
      return list
    }
  } catch {
    // Retorna vazio
  }
  return []
}

/**
 * Limite de adaptador tipado para submissão de traçado.
 */
export async function submitTracingSession(
  session: TracingSessionEvidenceV1,
): Promise<TracingRunSubmissionResult> {
  saveSessionEvidence(session)

  return {
    success: true,
    mode: 'local_boundary',
    sessionId: session.sessionId,
    status: session.status,
    synced: false,
    message:
      'Evidência de traçado serializada e armazenada localmente. Aguardando integração do ticket A5.',
  }
}

// --------------------------------------------------------------------------
// Limites Tipados de Configuração e Overrides (Ticket A4 / Preparação para A5)
// --------------------------------------------------------------------------

/**
 * Salva a configuração de traçado de um jogo.
 */
export async function saveTracingGameConfigApi(
  gameId: number,
  config: TracingGameConfig,
): Promise<TracingGameConfig> {
  try {
    const raw = window.localStorage.getItem(GAME_CONFIG_STORAGE_KEY)
    const map: Record<string, TracingGameConfig> = raw ? JSON.parse(raw) : {}
    map[String(gameId)] = config
    window.localStorage.setItem(GAME_CONFIG_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Silencioso
  }
  return config
}

/**
 * Busca a configuração de traçado de um jogo (ou retorna o padrão).
 */
export async function fetchTracingGameConfigApi(gameId: number): Promise<TracingGameConfig> {
  try {
    const raw = window.localStorage.getItem(GAME_CONFIG_STORAGE_KEY)
    if (raw) {
      const map: Record<string, TracingGameConfig> = JSON.parse(raw)
      if (map[String(gameId)]) {
        return map[String(gameId)]
      }
    }
  } catch {
    // Fallback
  }
  return { ...DEFAULT_TRACING_GAME_CONFIG }
}

/**
 * Busca os overrides de atribuição de uma criança específica para um jogo.
 */
export async function fetchChildAssignmentOverrideApi(
  childId: string,
  gameId: number,
): Promise<TracingAssignmentOverride | null> {
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY)
    if (raw) {
      const map: Record<string, TracingAssignmentOverride> = JSON.parse(raw)
      const key = `${childId}_${gameId}`
      return map[key] ?? null
    }
  } catch {
    // Fallback
  }
  return null
}

/**
 * Salva os overrides de atribuição de uma criança para um jogo.
 */
export async function saveChildAssignmentOverrideApi(
  override: TracingAssignmentOverride,
): Promise<TracingAssignmentOverride> {
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY)
    const map: Record<string, TracingAssignmentOverride> = raw ? JSON.parse(raw) : {}
    const key = `${override.childId}_${override.gameId}`
    map[key] = override
    window.localStorage.setItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Silencioso
  }
  return override
}

/**
 * Reseta os overrides de atribuição para herdar o padrão do jogo.
 */
export async function resetChildAssignmentOverrideApi(
  childId: string,
  gameId: number,
): Promise<void> {
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY)
    if (raw) {
      const map: Record<string, TracingAssignmentOverride> = JSON.parse(raw)
      const key = `${childId}_${gameId}`
      delete map[key]
      window.localStorage.setItem(ASSIGNMENT_OVERRIDE_STORAGE_KEY, JSON.stringify(map))
    }
  } catch {
    // Silencioso
  }
}

/**
 * Busca lista de crianças vinculadas ao profissional (limite tipado).
 * Retorna lista vazia na fronteira tipada até a integração da API real no Ticket A5 (sem dados inventados).
 */
export async function fetchLinkedChildrenApi(): Promise<LinkedChild[]> {
  return []
}

/**
 * Busca as partidas de traçado para revisão do profissional / responsável.
 * Retorna lista vazia quando não há sessões reais gravadas (sem sessões mock).
 */
export async function fetchTracingRunsListApi(): Promise<TracingSessionEvidenceV1[]> {
  return getLocalSessionEvidences()
}

/**
 * Busca o detalhe de uma partida de traçado pelo sessionId.
 */
export async function fetchTracingRunDetailApi(
  runId: string,
): Promise<TracingSessionEvidenceV1 | null> {
  const all = getLocalSessionEvidences()
  const found = all.find((s) => s.sessionId === runId)
  return found ?? null
}
