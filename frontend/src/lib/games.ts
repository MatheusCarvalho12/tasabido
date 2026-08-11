import { ApiRequestError, apiClient } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { ChildrenListResponse, GameListResponse } from '@/types/games'

// O tipo Game vive em types/game.ts (contrato único — também usado pelo
// preview modal da task T6); types/games.ts só reexporta.
export type { Game } from '@/types/game'

/**
 * Cliente tipado do modo criança (contrato T2/T3). O backend pode ainda estar
 * em construção: os tipos são o contrato e a integração real acontece na task
 * de integração (T8). Zero mock — nenhum dado de exemplo vive aqui.
 */

async function requestList<T>(url: string, query?: Record<string, string>): Promise<T> {
  // O client do hey-api extrai a "shape" da resposta; o envelope {items} não
  // tem chave data, então tipamos o resultado explicitamente (contrato fixo).
  const { data, error, response } = (await apiClient.get<T, { detail?: string }>({
    url,
    query,
    headers: { Authorization: `Bearer ${getToken()}` },
  })) as { data?: T; error?: { detail?: string }; response: Response }
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar os dados.',
    )
  }
  return data
}

/** GET /api/games?scope=public — jogos públicos publicados (ordenados por partidas). */
export async function fetchPublicGamesApi(): Promise<GameListResponse> {
  return requestList<GameListResponse>('/api/games', { scope: 'public' })
}

/** GET /api/children/{childId}/assignments — "Para casa" da criança. */
export async function fetchAssignmentsApi(childId: string): Promise<GameListResponse> {
  return requestList<GameListResponse>(`/api/children/${childId}/assignments`)
}

/** GET /api/children — crianças da família autenticada (nome da saudação). */
export async function fetchChildrenApi(): Promise<ChildrenListResponse> {
  return requestList<ChildrenListResponse>('/api/children')
}

/* ------------------------------------------------------------------ */
/* Formatação pt-BR das stats reais do contrato (nunca inventa número). */
/* ------------------------------------------------------------------ */

/** 2.100 → "2,1 mil"; 12.000 → "12 mil"; 1.234.567 → "1,2 mi"; 0 → "0". */
export function formatCompactCount(value: number): string {
  if (value < 1000) {
    return String(value)
  }
  if (value < 1_000_000) {
    return `${formatDecimal(value / 1000)} mil`
  }
  return `${formatDecimal(value / 1_000_000)} mi`
}

/** Partidas no card/preview: 2.100 → "2,1 mil". */
export function formatPartidas(partidas: number): string {
  return formatCompactCount(partidas)
}

/** 96 → "4,8" (escala de 0 a 5 estrelas com uma casa, vírgula pt-BR). */
export function formatScoreStars(score: number): string {
  const stars = Math.max(0, Math.min(100, score)) / 20
  return formatDecimal(stars)
}

/** Pontuação média no preview: 87 → "87%". */
export function formatScore(score: number): string {
  return `${Math.round(Math.max(0, Math.min(100, score)))}%`
}

/** Tempo médio no preview: 12 → "12 min". */
export function formatTempoMedio(min: number): string {
  return `${Math.round(min)} min`
}

/** "2,1 mil jogadas" / "1 jogada" / "0 jogadas". */
export function formatPlaysLabel(partidas: number): string {
  return `${formatCompactCount(partidas)} jogada${partidas === 1 ? '' : 's'}`
}

function formatDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

/* ------------------------------------------------------------------ */
/* Categoria: rótulo humano pt-BR (pill do preview modal).            */
/* ------------------------------------------------------------------ */

/** Rótulos pt-BR conhecidos das categorias do contrato. */
const CATEGORY_LABELS: Record<string, string> = {
  escrita: 'Escrita',
  'coordenacao-motora': 'Coordenação motora',
  coordenacao_motora: 'Coordenação motora',
}

/** Rótulo humano da categoria; fallback = slug humanizado (nunca vazio). */
export function categoriaLabel(categoria: string): string {
  const known = CATEGORY_LABELS[categoria.trim().toLowerCase()]
  if (known) return known
  return categoria
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())
}
