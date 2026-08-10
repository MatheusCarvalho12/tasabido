import { z } from 'zod'

export function validateEmail(value: string): string | undefined {
  const result = z.email({ message: 'Digite um e-mail válido.' }).safeParse(value)
  if (result.success) {
    return undefined
  }
  return result.error.issues[0]?.message
}

export function validatePassword(value: string): string | undefined {
  const result = z
    .string()
    .min(8, { message: 'A senha precisa de pelo menos 8 caracteres.' })
    .safeParse(value)
  if (result.success) {
    return undefined
  }
  return result.error.issues[0]?.message
}
