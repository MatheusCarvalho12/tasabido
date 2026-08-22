/**
 * Adaptadores de API e persistência de sessões de traçado (Ticket A1/A3).
 * Integra com POST /api/game-runs sem inventar endpoints não existentes no backend.
 */

import { ApiRequestError, apiClient } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { TracingEvidenceV1 } from './types'

export interface SubmitRunPayload {
  game_id: number
  child_id: string
  score: number // 0-100 (arredondado)
  duration_seconds: number
}

export interface GameRunResult {
  id: number
  game_id: number
  child_id: string
  score: number
  duration_seconds: number
  created_at: string
}

const EVIDENCE_STORAGE_KEY = 'tasabido.tracing_evidences'

/**
 * Salva a evidência localmente no sessionStorage/localStorage para auditoria e futura integração A5.
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
 * Recupera todas as evidências salvas na sessão atual.
 */
export function getLocalEvidences(): TracingEvidenceV1[] {
  try {
    const raw = window.sessionStorage.getItem(EVIDENCE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Envia uma partida concluída para o endpoint oficial POST /api/game-runs.
 * Se o jogo não estiver publicado ou falhar na rede, não quebra a experiência da criança.
 */
export async function submitTracingRunApi(
  payload: SubmitRunPayload,
): Promise<GameRunResult | null> {
  const token = getToken()
  if (!token) {
    return null
  }

  try {
    const { data, error, response } = (await apiClient.post<GameRunResult, { detail?: string }>({
      url: '/api/game-runs',
      body: payload,
      headers: { Authorization: `Bearer ${token}` },
    })) as { data?: GameRunResult; error?: { detail?: string }; response: Response }

    if (!data) {
      throw new ApiRequestError(
        response.status,
        error?.detail ?? 'Não foi possível registrar a partida.',
      )
    }

    return data
  } catch (err) {
    // Log silencioso para resiliência: a criança nunca deve ver tela de erro por falha de telemetria
    console.warn('[TracingAdapter] Falha ao enviar game-run para backend:', err)
    return null
  }
}
