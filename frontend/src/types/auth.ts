export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface LoginRequest {
  email: string
  password: string
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
