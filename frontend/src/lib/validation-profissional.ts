import { cnpj } from 'cpf-cnpj-validator'
import { z } from 'zod'

import { labelConselho, REGRA_NUMERO_REGISTRO } from '@/lib/cadastro-profissional'
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
import type { Conselho } from '@/types/cadastro-profissional'

export const MSG_CONSELHO = 'Qual o seu conselho profissional?'
export const MSG_REGISTRO = 'Qual o número do seu registro?'
export const MSG_REGISTRO_CURTO = 'O número do registro precisa ter pelo menos 4 dígitos.'
export const MSG_CONFERE_REGISTRO = 'Confere o número do registro? O formato mudou com o conselho.'
export const MSG_REGIAO = 'Qual a UF ou região do seu registro?'
export const MSG_REGISTRO_CREFITO_FORMATO =
  'Confere o número do CREFITO? Aceita 4 a 6 dígitos, com -F ou -TO opcional.'
export const MSG_REGISTRO_CRFA_FORMATO =
  'Confere o número do CRFa? Aceita 4 a 6 dígitos ou o formato região-número, ex.: 2-12345.'
export const MSG_CNPJ = 'Esse CNPJ não parece válido. Confere os números?'

/** CNPJ: opcional; quando preenchido, validação REAL dos dígitos (cpf-cnpj-validator). */
export function validateCnpj(value: string): string | undefined {
  const digitos = value.replace(/\D/g, '')
  if (!digitos) {
    return undefined
  }
  return cnpj.isValid(digitos) ? undefined : MSG_CNPJ
}

/** Mensagem de máximo de dígitos, citando o conselho quando ele é conhecido. */
export function msgRegistroMaximo(max: number, conselho?: Conselho | string | null): string {
  const rotulo =
    conselho && conselho !== 'outro' ? ` do ${labelConselho(conselho as Conselho)}` : ''
  return `O número do registro${rotulo} tem no máximo ${max} dígitos.`
}

/**
 * Número do registro profissional: obrigatório, com a regra do conselho
 * selecionado — CRM 4–7; demais 4–6; "Outro" até 10; CREFITO aceita sufixo
 * -F/-TO; CRFa aceita número puro ou formato região-número ("2-12345").
 */
export function validateNumeroRegistro(
  value: string,
  conselho?: Conselho | string | null,
): string | undefined {
  const valor = value.trim()
  const digitos = valor.replace(/\D/g, '')
  if (!digitos) {
    return MSG_REGISTRO
  }
  if (conselho === 'crefito') {
    if (/^\d{4,6}(-(F|TO))?$/.test(valor)) {
      return undefined
    }
    if (digitos.length < 4) {
      return MSG_REGISTRO_CURTO
    }
    if (digitos.length > 6) {
      return msgRegistroMaximo(6, conselho)
    }
    return MSG_REGISTRO_CREFITO_FORMATO
  }
  if (conselho === 'crfa') {
    if (/^\d{1,2}-\d{4,6}$/.test(valor) || /^\d{4,6}$/.test(valor)) {
      return undefined
    }
    if (digitos.length < 4) {
      return MSG_REGISTRO_CURTO
    }
    if (digitos.length > 6) {
      return msgRegistroMaximo(6, conselho)
    }
    return MSG_REGISTRO_CRFA_FORMATO
  }
  const regra = REGRA_NUMERO_REGISTRO[conselho as Conselho] ?? REGRA_NUMERO_REGISTRO.crm
  if (digitos.length < regra.min) {
    return MSG_REGISTRO_CURTO
  }
  if (digitos.length > regra.max) {
    return msgRegistroMaximo(regra.max, conselho)
  }
  return undefined
}

/** Campo opcional: quando preenchido, CNPJ com dígitos verificadores válidos. */
const cnpjSchema = z
  .string()
  .trim()
  .refine((value) => value === '' || validateCnpj(value) === undefined, MSG_CNPJ)

/** Passo 3 — "Documento profissional" (conselho + registro + UF/região obrigatórios). */
export const documentoProfissionalSchema = z
  .object({
    conselho: z.string().min(1, MSG_CONSELHO),
    numeroRegistro: z.string().trim().min(1, MSG_REGISTRO),
    uf: z.string().min(1, MSG_REGIAO),
    cnpj: cnpjSchema,
  })
  .superRefine((dados, ctx) => {
    // Regra do número do registro conforme o conselho selecionado (CRM 4–7; Outro até 10).
    const erro = validateNumeroRegistro(dados.numeroRegistro, dados.conselho)
    if (erro && erro !== MSG_REGISTRO) {
      ctx.addIssue({ code: 'custom', path: ['numeroRegistro'], message: erro })
    }
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
