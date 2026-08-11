import { apiClient, ApiRequestError } from '@/lib/api'
import { getToken } from '@/lib/auth'
import type { ApiErrorBody } from '@/types/auth'

export interface ParentPinValidateRequest {
  pin: string
}

export interface ParentPinValidateResponse {
  valido: boolean
}

/**
 * POST /api/family/pin/validate — valida o PIN dos pais da família autenticada.
 * Contrato (T3 backend): 200 {valido: true} | 401 {valido: false}.
 * O PIN só viaja no corpo da requisição; nunca é logado nem persistido.
 */
export async function validateParentPinApi(pin: string): Promise<ParentPinValidateResponse> {
  const { data, error, response } = await apiClient.post<ParentPinValidateResponse, ApiErrorBody>({
    url: '/api/family/pin/validate',
    body: { pin } satisfies ParentPinValidateRequest,
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!data) {
    throw new ApiRequestError(response.status, error?.detail ?? 'Não foi possível validar o PIN.')
  }
  return data
}
