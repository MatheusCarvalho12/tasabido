import { createClient } from '@hey-api/client-fetch'

import { getToken } from '@/lib/auth'
import type { ApiErrorBody, LoginRequest, LoginResponse, MeResponse, User } from '@/types/auth'
import type { RegisterRequest, RegisterResponse } from '@/types/cadastro'

export const apiClient = createClient({
  baseUrl: 'http://localhost:8000',
})

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

export async function registerApi(body: RegisterRequest): Promise<RegisterResponse> {
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
