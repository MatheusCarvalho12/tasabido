export interface User {
  id: string
  name: string
  email: string
  role: string
}

export type AuthRole = 'family' | 'professional'

export interface LoginRequest {
  email: string
  password: string
  role?: AuthRole
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface MeResponse {
  user: User
}

export interface ApiErrorBody {
  detail?: string
}
