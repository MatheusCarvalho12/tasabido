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

export function validateName(value: string): string | undefined {
  if (value.trim().length >= 2) {
    return undefined
  }
  return 'Digite o nome completo.'
}

/** Telefone brasileiro flexível: 10 ou 11 dígitos (com ou sem formatação). */
export function validatePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) {
    return undefined
  }
  return 'Digite um telefone com DDD.'
}

/** Idade opcional; quando preenchida, precisa ser um número de 0 a 120. */
export function validateIdade(value: string): string | undefined {
  if (!value.trim()) {
    return undefined
  }
  const idade = Number(value)
  if (Number.isInteger(idade) && idade >= 0 && idade <= 120) {
    return undefined
  }
  return 'Digite uma idade válida.'
}

/** Peso opcional da criança; quando preenchido, precisa ser um número plausível. */
export function validatePeso(value: string): string | undefined {
  if (!value.trim()) {
    return undefined
  }
  const peso = Number(value.replace(',', '.'))
  if (Number.isFinite(peso) && peso > 0 && peso <= 300) {
    return undefined
  }
  return 'Digite um peso válido.'
}

export function validateChildName(value: string): string | undefined {
  if (value.trim().length >= 2) {
    return undefined
  }
  return 'Digite o nome da criança.'
}

export function validatePasswordMatch(value: string, password: string): string | undefined {
  if (value === password) {
    return undefined
  }
  return 'As senhas não conferem.'
}
