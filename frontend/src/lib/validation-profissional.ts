import { cnpj } from 'cpf-cnpj-validator'
import { z } from 'zod'

import {
  MSG_CPF,
  MSG_DATA_INVALIDA,
  MSG_EMAIL,
  MSG_NOME,
  MSG_SENHA,
  MSG_SENHAS,
  MSG_TELEFONE,
  validateCpf,
  validateDataNascimento,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '@/lib/validation'

export const MSG_CONSELHO = 'Qual o seu conselho profissional?'
export const MSG_REGISTRO = 'Qual o número do seu registro?'
export const MSG_UF = 'Qual a UF do seu registro?'
export const MSG_CNPJ = 'Esse CNPJ não parece válido. Confere os números?'

/** CNPJ: opcional; quando preenchido, validação REAL dos dígitos (cpf-cnpj-validator). */
export function validateCnpj(value: string): string | undefined {
  const digitos = value.replace(/\D/g, '')
  if (!digitos) {
    return undefined
  }
  return cnpj.isValid(digitos) ? undefined : MSG_CNPJ
}

/** Número do registro profissional: obrigatório, mínimo 3 caracteres. */
export function validateNumeroRegistro(value: string): string | undefined {
  return value.trim().length >= 3 ? undefined : MSG_REGISTRO
}

/** Campo opcional: quando preenchido, CNPJ com dígitos verificadores válidos. */
const cnpjSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || validateCnpj(value) === undefined, MSG_CNPJ)

/** Passo 3 — "Documento profissional" (conselho + registro + UF obrigatórios). */
export const documentoProfissionalSchema = z.object({
  conselho: z.string().min(1, MSG_CONSELHO),
  numeroRegistro: z.string().trim().min(3, MSG_REGISTRO),
  uf: z.string().min(2, MSG_UF),
  cnpj: cnpjSchema,
})

/** Passo 2 — "Sobre você" do profissional (sem CEP; sem confirmação entre campos). */
export const sobreProfissionalSchema = z.object({
  nome: z
    .string()
    .trim()
    .refine((value) => validateName(value) === undefined, MSG_NOME),
  cpf: z
    .string()
    .trim()
    .refine((value) => validateCpf(value) === undefined, MSG_CPF),
  telefone: z
    .string()
    .trim()
    .refine((value) => validatePhone(value) === undefined, MSG_TELEFONE),
  email: z
    .string()
    .trim()
    .refine((value) => validateEmail(value) === undefined, MSG_EMAIL),
  dataNascimento: z
    .string()
    .trim()
    .refine((value) => validateDataNascimento(value) === undefined, MSG_DATA_INVALIDA),
  senha: z
    .string()
    .trim()
    .refine((value) => validatePassword(value) === undefined, MSG_SENHA),
})

/** Passo 2 com a confirmação de senha — usado no formulário. */
export const sobreProfissionalComConfirmacaoSchema = sobreProfissionalSchema
  .extend({ confirmarSenha: z.string().trim() })
  .superRefine((dados, ctx) => {
    if (dados.senha && dados.confirmarSenha !== dados.senha) {
      ctx.addIssue({ code: 'custom', path: ['confirmarSenha'], message: MSG_SENHAS })
    }
  })
