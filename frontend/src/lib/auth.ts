import type { User } from '@/types/auth'

const TOKEN_KEY = 'tasabido.token'
const USER_KEY = 'tasabido.user'

function storageFor(remember: boolean): Storage {
  // "Lembrar de mim" marcado: sessão dura entre visitas (localStorage).
  // Sem o marcador: vale só para a aba atual (sessionStorage).
  return remember ? window.localStorage : window.sessionStorage
}

export function saveAuth(token: string, user: User, remember: boolean): void {
  const storage = storageFor(remember)
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY) ?? window.sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
  const raw = window.localStorage.getItem(USER_KEY) ?? window.sessionStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
  window.sessionStorage.removeItem(TOKEN_KEY)
  window.sessionStorage.removeItem(USER_KEY)
}
