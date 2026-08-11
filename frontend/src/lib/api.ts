import { createClient } from '@hey-api/client-fetch'

import { getToken } from '@/lib/auth'
import type { ApiErrorBody, LoginRequest, LoginResponse, MeResponse, User } from '@/types/auth'
import type { RegisterRequest, RegisterResponse } from '@/types/cadastro'
import type { RegisterProfessionalRequest } from '@/types/cadastro-profissional'

/** Base da API local (backend FastAPI na porta 8000). */
export const API_BASE_URL = 'http://localhost:8000'

export const apiClient = createClient({
  baseUrl: API_BASE_URL,
})

/**
 * Resolve caminhos relativos da API (ex.: svg_url "/api/games/1/svg")
 * para URL absoluta; URLs completas passam direto.
 */
export function resolveAssetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export async function loginApi(body: LoginRequest): Promise<LoginResponse> {
  const { data, error, response } = await apiClient.post<LoginResponse, ApiErrorBody>({
    url: '/auth/login',
    body,
  })
  if (!data) {
    throw new ApiRequestError(response.status, error?.detail ?? 'Não foi possível entrar.')
  }
  return data
}

/** Corpo do POST /auth/register: papel família ou profissional. */
export type RegisterPayload = RegisterRequest | RegisterProfessionalRequest

export async function registerApi(body: RegisterPayload): Promise<RegisterResponse> {
  const { data, error, response } = await apiClient.post<RegisterResponse, ApiErrorBody>({
    url: '/auth/register',
    body,
  })
  if (!data) {
    throw new ApiRequestError(response.status, error?.detail ?? 'Não foi possível criar sua conta.')
  }
  return data
}

export async function fetchMeApi(): Promise<User> {
  const { data, error, response } = await apiClient.get<MeResponse, ApiErrorBody>({
    url: '/auth/me',
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!data) {
    throw new ApiRequestError(
      response.status,
      error?.detail ?? 'Não foi possível carregar seus dados.',
    )
  }
  return data.user
}
