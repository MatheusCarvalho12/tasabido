/**
 * Adaptadores de API e persistência de sessões de traçado (Ticket A1/A3).
 * Limite tipado para integração A5 (/api/tracing-runs).
 * Não envia scores não-autoritativos para POST /api/game-runs legado.
 */

import type { TracingEvidenceV1, TracingSessionEvidenceV1 } from './types'

const EVIDENCE_STORAGE_KEY = 'tasabido.tracing_evidences'
const SESSION_EVIDENCE_STORAGE_KEY = 'tasabido.tracing_sessions'

export interface TracingRunSubmissionResult {
  success: boolean
  mode: 'local_boundary'
  sessionId: string
  status: 'completed' | 'abandoned'
  synced: boolean
  message: string
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
 * Salva o pacote completo da sessão (completa ou abandonada) no sessionStorage/localStorage.
 */
export function saveSessionEvidence(session: TracingSessionEvidenceV1): void {
  try {
    const existing = window.sessionStorage.getItem(SESSION_EVIDENCE_STORAGE_KEY)
    const list: TracingSessionEvidenceV1[] = existing ? JSON.parse(existing) : []
    list.push(session)
    window.sessionStorage.setItem(SESSION_EVIDENCE_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Silencioso
  }
}

/**
 * Recupera todas as sessões salvas.
 */
export function getLocalSessionEvidences(): TracingSessionEvidenceV1[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_EVIDENCE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Limite de adaptador tipado para submissão de traçado.
 * A5 integrará /api/tracing-runs autoritativo. Até lá, retém evidências locais fielmente.
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
