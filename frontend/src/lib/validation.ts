import { zodValidator } from 'cpf-cnpj-validator/zod'
import { parsePhoneNumber } from 'libphonenumber-js/max'
import { type ZodType, z } from 'zod'

import { calcAge, parseBrDate } from '@/lib/cadastro'

/**
 * Validação REAL do cadastro familiar (passos 2 e 3).
 * Regras idênticas às do backend (contrato) e mensagens humanizadas pt-BR.
 */

export const MSG_NOME = 'Precisamos do seu nome pra te chamar do jeito certo'
export const MSG_TELEFONE = 'Esse telefone não parece certo. Confere o DDD e o número?'
export const MSG_CPF = 'Esse CPF não parece válido. Confere os números?'
export const MSG_EMAIL = 'Esse e-mail não parece certo. Dá uma conferida?'
export const MSG_IDADE = 'A idade precisa ser entre 0 e 120 anos'
export const MSG_SENHA = 'A senha precisa ter pelo menos 8 caracteres, com letra e número'
export const MSG_SENHAS = 'As senhas não batem. Confere de novo?'
export const MSG_NOME_CRIANCA = 'Qual o nome da criança?'
export const MSG_DATA_INVALIDA = 'Data inválida. Use o formato dd/mm/aaaa.'
export const MSG_DATA_FUTURA = 'Essa data não pode estar no futuro'
export const MSG_DATA_ANTIGA = 'Essa data é de mais de 120 anos atrás. Dá uma conferida?'
export const MSG_PESO = 'O peso precisa ser entre 0 e 300 kg'

/** Nomes de pessoas: letras (incluindo acentos) e espaços. */
const NOME_REGEX = /^[\p{L}\s]+$/u

const nomeCompletoSchema = z.string().trim().min(2, MSG_NOME).regex(NOME_REGEX, MSG_NOME)

/** CPF: validação REAL dos dígitos verificadores via cpf-cnpj-validator (adapter zod). */
const { cpf: zCpf } = zodValidator(z)
const cpfSchema = zCpf(MSG_CPF)

/** Telefone: validação REAL via libphonenumber-js (metadata max, como o Google). */
export function validatePhone(value: string): string | undefined {
  const digitos = value.replace(/\D/g, '')
  if (digitos.length < 10) {
    return MSG_TELEFONE
  }
  try {
    return parsePhoneNumber(digitos, 'BR').isValid() ? undefined : MSG_TELEFONE
  } catch {
    return MSG_TELEFONE
  }
}

const telefoneSchema = z
  .string()
  .trim()
  .refine((value) => validatePhone(value) === undefined, MSG_TELEFONE)

const emailSchema = z.email({ message: MSG_EMAIL })

/** Idade: opcional; quando preenchida, inteiro de 0 a 120. */
export function validateIdade(value: string): string | undefined {
  const idade = value.trim()
  if (!idade) {
    return undefined
  }
  if (!/^\d+$/.test(idade)) {
    return MSG_IDADE
  }
  const numero = Number(idade)
  return Number.isInteger(numero) && numero >= 0 && numero <= 120 ? undefined : MSG_IDADE
}

const idadeSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || validateIdade(value) === undefined, MSG_IDADE)

/** Senha: mínimo 8 caracteres com pelo menos 1 letra e 1 número. */
const senhaSchema = z
  .string()
  .min(8, MSG_SENHA)
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, MSG_SENHA)

/** Passo 2 — "Sobre você" (campos, sem a confirmação entre campos). */
const sobreVoceBaseSchema = z.object({
  nome: nomeCompletoSchema,
  cpf: cpfSchema,
  telefone: telefoneSchema,
  email: emailSchema,
  idade: idadeSchema,
  senha: senhaSchema,
})

export const sobreVoceSchema = sobreVoceBaseSchema
  .extend({ confirmarSenha: z.string().trim() })
  .superRefine((dados, ctx) => {
    if (dados.senha && dados.confirmarSenha !== dados.senha) {
      ctx.addIssue({ code: 'custom', path: ['confirmarSenha'], message: MSG_SENHAS })
    }
  })

/** Passo 2 sem a confirmação — usado no passo 4 com os dados salvos da store. */
export const sobreVoceSemConfirmacaoSchema = sobreVoceBaseSchema

/** Data de nascimento: opcional; quando preenchida, válida, não futura e até 120 anos. */
export function validateDataNascimento(value: string): string | undefined {
  const data = value.trim()
  if (!data) {
    return undefined
  }
  const date = parseBrDate(data)
  if (!date) {
    return MSG_DATA_INVALIDA
  }
  if (date > new Date()) {
    return MSG_DATA_FUTURA
  }
  if (calcAge(date) > 120) {
    return MSG_DATA_ANTIGA
  }
  return undefined
}

const dataNascimentoSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || parseBrDate(value) !== null, MSG_DATA_INVALIDA)
  .refine(
    (value) => value === '' || (parseBrDate(value) ?? new Date(0)).getTime() <= Date.now(),
    MSG_DATA_FUTURA,
  )
  .refine(
    (value) => value === '' || calcAge(parseBrDate(value) ?? new Date(0)) <= 120,
    MSG_DATA_ANTIGA,
  )

const nomeCriancaSchema = z
  .string()
  .trim()
  .min(2, MSG_NOME_CRIANCA)
  .regex(NOME_REGEX, MSG_NOME_CRIANCA)

/** Peso: opcional; quando preenchido, decimal (vírgula ou ponto) entre 0 e 300 kg. */
export function validatePeso(value: string): string | undefined {
  const bruto = value.trim()
  if (!bruto) {
    return undefined
  }
  const numero = Number(bruto.replace(',', '.'))
  return Number.isFinite(numero) && numero > 0 && numero <= 300 ? undefined : MSG_PESO
}

const pesoSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || validatePeso(value) === undefined, MSG_PESO)

/** Passo 3 — "Sua família". */
export const suaFamiliaSchema = z.object({
  nome: nomeCriancaSchema,
  cpf: cpfSchema,
  dataNascimento: dataNascimentoSchema,
  idade: idadeSchema,
  peso: pesoSchema,
})

function mensagemDe(schema: ZodType, value: unknown): string | undefined {
  const resultado = schema.safeParse(value)
  return resultado.success ? undefined : resultado.error.issues[0]?.message
}

export function validateName(value: string): string | undefined {
  return mensagemDe(nomeCompletoSchema, value)
}

export function validateEmail(value: string): string | undefined {
  return mensagemDe(emailSchema, value)
}

export function validateCpf(value: string): string | undefined {
  return mensagemDe(cpfSchema, value)
}

export function validatePassword(value: string): string | undefined {
  return mensagemDe(senhaSchema, value)
}

/** Senha do login: apenas obrigatória (a composição é regra de cadastro). */
export function validateLoginPassword(value: string): string | undefined {
  return value ? undefined : 'Digite sua senha.'
}

export function validatePasswordMatch(value: string, senha: string): string | undefined {
  return value === senha ? undefined : MSG_SENHAS
}

export function validateChildName(value: string): string | undefined {
  return mensagemDe(nomeCriancaSchema, value)
}
