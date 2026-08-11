import { z } from 'zod'

import { API_BASE_URL, ApiRequestError, apiClient } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { ChildrenListResponse, GameListResponse } from '@/types/games'

// O tipo Game vive em types/game.ts (contrato único — também usado pelo
// preview modal da task T6); types/games.ts só reexporta.
export type { Game } from '@/types/game'

import type { Game } from '@/types/game'

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

/* ------------------------------------------------------------------ */
/* Gestão do profissional (T9): CRUD real, zero mock.                  */
/* ------------------------------------------------------------------ */

/** Corpo do POST/PATCH /api/games — mesmo contrato do backend (schemas.py). */
export interface GameFormPayload {
  titulo: string
  descricao: string
  tutorial: string
  categoria: string
  visibilidade: 'public' | 'private'
  cores: string[]
}

/** Arquivos opcionais do form (SVG, thumbnail e banner) — sobem após salvar. */
export interface GameFilesPayload {
  svg: File | null
  thumb: File | null
  banner: File | null
}

/** GET /api/games?scope=mine — jogos do profissional autenticado. */
export async function fetchMyGamesApi(): Promise<GameListResponse> {
  return requestList<GameListResponse>('/api/games', { scope: 'mine' })
}

interface SvgUploadResponse {
  svg_url: string
}

async function requestMutation<T>(
  method: 'post' | 'patch',
  url: string,
  body: GameFormPayload,
): Promise<T> {
  const { data, error, response } = (await apiClient[method]<T, { detail?: string }>({
    url,
    body,
    headers: { Authorization: `Bearer ${getToken()}` },
  })) as { data?: T; error?: { detail?: string }; response: Response }
  if (!data) {
    throw new ApiRequestError(response.status, error?.detail ?? 'Não foi possível salvar o jogo.')
  }
  return data
}

/** POST /api/games — cria como rascunho (status draft, contrato do backend). */
export async function createGameApi(payload: GameFormPayload) {
  return requestMutation<Game>('post', '/api/games', payload)
}

/** PATCH /api/games/{id} — atualiza campos do jogo. */
export async function updateGameApi(gameId: number, payload: GameFormPayload) {
  return requestMutation<Game>('patch', `/api/games/${gameId}`, payload)
}

/** POST /api/games/{id}/publish — draft → published (idempotente). */
export async function publishGameApi(gameId: number) {
  const { data, error, response } = (await apiClient.post<Game, { detail?: string }>({
    url: `/api/games/${gameId}/publish`,
    headers: { Authorization: `Bearer ${getToken()}` },
  })) as { data?: Game; error?: { detail?: string }; response: Response }
  if (!data) {
    throw new ApiRequestError(response.status, error?.detail ?? 'Não foi possível publicar o jogo.')
  }
  return data
}

/** PATCH /api/games/{id} com status draft — published → rascunho (despublicar). */
export async function unpublishGameApi(gameId: number) {
  const { data, error, response } = (await apiClient.patch<Game, { detail?: string }>({
    url: `/api/games/${gameId}`,
    body: { status: 'draft' },
    headers: { Authorization: `Bearer ${getToken()}` },
  })) as { data?: Game; error?: { detail?: string }; response: Response }
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível despublicar o jogo.',
    )
  }
  return data
}

/**
 * POST /api/games/{id}/svg (multipart). Usa fetch nativo de propósito: o
 * client hey-api (0.13.1) serializa body como JSON por padrão e manteria o
 * Content-Type application/json — o browser é quem monta o boundary do
 * multipart corretamente quando o body é FormData sem header manual.
 */
export async function uploadGameSvgApi(gameId: number, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE_URL}/api/games/${gameId}/svg`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  })
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      (await readDetail(response)) ?? 'Não foi possível enviar o SVG do jogo.',
    )
  }
  const body = (await response.json()) as SvgUploadResponse
  return body.svg_url
}

/** POST /api/games/{id}/images (multipart, thumb e/ou banner). */
export async function uploadGameImagesApi(gameId: number, thumb: File | null, banner: File | null) {
  const formData = new FormData()
  if (thumb) formData.append('thumb', thumb)
  if (banner) formData.append('banner', banner)
  const response = await fetch(`${API_BASE_URL}/api/games/${gameId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  })
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      (await readDetail(response)) ?? 'Não foi possível enviar as imagens do jogo.',
    )
  }
  return (await response.json()) as Game
}

async function readDetail(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { detail?: string }
    return body.detail ?? null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/* Validação do form de gestão (mesmas regras do backend, pt-BR).      */
/* ------------------------------------------------------------------ */

export const MSG_TITULO = 'Dá um título com pelo menos 2 letras pro jogo'
export const MSG_DESCRICAO = 'Escreve uma descrição do jogo pra família entender'
export const MSG_TUTORIAL = 'Escreve o tutorial — é o que a criança lê antes de jogar'
export const MSG_CATEGORIA = 'Escolhe uma categoria pro jogo'
export const MSG_COR_INVALIDA = 'Essa cor não é válida'

/** Validação do formulário de criar/editar (contrato idêntico ao backend). */
export const gameFormSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(2, MSG_TITULO)
    .max(200, 'O título pode ter no máximo 200 caracteres'),
  descricao: z
    .string()
    .trim()
    .min(1, MSG_DESCRICAO)
    .max(5000, 'A descrição pode ter no máximo 5000 caracteres'),
  tutorial: z
    .string()
    .trim()
    .min(1, MSG_TUTORIAL)
    .max(5000, 'O tutorial pode ter no máximo 5000 caracteres'),
  categoria: z
    .string()
    .trim()
    .min(1, MSG_CATEGORIA)
    .max(50, 'A categoria pode ter no máximo 50 caracteres'),
  visibilidade: z.enum(['public', 'private']),
  cores: z.array(z.string().regex(/^#[0-9A-F]{6}$/i, MSG_COR_INVALIDA)).max(3),
})

export type GameFormValues = z.infer<typeof gameFormSchema>

/** Regras de upload espelhando os limites do backend (games.py). */
export interface UploadRule {
  /** Extensões aceitas (mesma lista do backend). */
  accept: string
  maxBytes: number
  /** Nome amigável do tipo de arquivo (ex.: "SVG"). */
  typeLabel: string
  /** Nome do campo (ex.: "A thumbnail") para as mensagens. */
  fieldLabel: string
}

export const SVG_UPLOAD_RULE: UploadRule = {
  accept: '.svg',
  maxBytes: 500 * 1024,
  typeLabel: 'SVG',
  fieldLabel: 'O SVG',
}

export const IMAGE_UPLOAD_RULE: UploadRule = {
  accept: '.png,.jpg,.jpeg,.webp,.svg',
  maxBytes: 1024 * 1024,
  typeLabel: 'imagem',
  fieldLabel: 'A imagem',
}

/** Valida um arquivo escolhido contra a regra; undefined quando está ok. */
export function validateUploadFile(file: File, rule: UploadRule): string | undefined {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowed = rule.accept.split(',').map((ext) => ext.trim().slice(1))
  if (!allowed.includes(extension)) {
    return rule.fieldLabel === 'O SVG'
      ? 'O arquivo precisa ser um SVG (.svg)'
      : `${rule.fieldLabel} precisa ser PNG, JPG, WebP ou SVG`
  }
  if (file.size > rule.maxBytes) {
    const maxLabel = rule.typeLabel === 'SVG' ? '500 KB' : '1 MB'
    return `${rule.fieldLabel} precisa ter no máximo ${maxLabel}`
  }
  return undefined
}
