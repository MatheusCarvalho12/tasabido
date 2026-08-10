import { describe, expect, it } from 'vitest'

import {
  documentoProfissionalSchema,
  MSG_CNPJ,
  MSG_CONSELHO,
  MSG_REGISTRO,
  MSG_UF,
  sobreProfissionalSchema,
  validateCnpj,
  validateNumeroRegistro,
} from '@/lib/validation-profissional'

describe('validação de CNPJ (cpf-cnpj-validator)', () => {
  it('aceita CNPJ com dígitos verificadores válidos', () => {
    expect(validateCnpj('12.345.678/0001-95')).toBeUndefined()
  })

  it('aceita CNPJ sem máscara (só dígitos)', () => {
    expect(validateCnpj('12345678000195')).toBeUndefined()
  })

  it('rejeita CNPJ com dígitos inválidos', () => {
    expect(validateCnpj('12.345.678/0001-00')).toBe(MSG_CNPJ)
  })

  it('CNPJ vazio é opcional (sem erro)', () => {
    expect(validateCnpj('')).toBeUndefined()
    expect(validateCnpj('   ')).toBeUndefined()
  })
})

describe('validação do documento profissional (passo 3)', () => {
  it('exige conselho, número do registro e UF', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: '',
      numeroRegistro: '1',
      uf: '',
      cnpj: '',
    })
    expect(resultado.success).toBe(false)
    const issues = resultado.error?.issues ?? []
    const mensagens = issues.map((issue) => issue.message)
    expect(mensagens).toContain(MSG_CONSELHO)
    expect(mensagens).toContain(MSG_REGISTRO)
    expect(mensagens).toContain(MSG_UF)
  })

  it('aceita documento completo com CNPJ válido', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crp',
      numeroRegistro: '12345',
      uf: 'SP',
      cnpj: '12.345.678/0001-95',
    })
    expect(resultado.success).toBe(true)
  })

  it('rejeita CNPJ inválido mesmo com o resto completo', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crm',
      numeroRegistro: '12345',
      uf: 'SP',
      cnpj: '12.345.678/0001-00',
    })
    expect(resultado.success).toBe(false)
    const mensagens = (resultado.error?.issues ?? []).map((issue) => issue.message)
    expect(mensagens).toContain(MSG_CNPJ)
  })

  it('permite CNPJ vazio (opcional)', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crefito',
      numeroRegistro: '9876',
      uf: 'RJ',
      cnpj: '',
    })
    expect(resultado.success).toBe(true)
  })
})

describe('validação do número do registro', () => {
  it('rejeita registro com menos de 2 dígitos', () => {
    expect(validateNumeroRegistro('1')).toBe(MSG_REGISTRO)
    expect(validateNumeroRegistro('a')).toBe(MSG_REGISTRO)
    expect(validateNumeroRegistro('')).toBe(MSG_REGISTRO)
  })

  it('aceita registro com 2+ dígitos (somente números contam)', () => {
    expect(validateNumeroRegistro('12')).toBeUndefined()
    expect(validateNumeroRegistro('1234567890')).toBeUndefined()
  })
})

describe('validação do "Sobre você" profissional (passo 2)', () => {
  const SOBRE_VALIDO = {
    nome: 'Ana Souza',
    cpf: '295.379.955-93',
    telefone: '(11) 98765-4321',
    email: 'ana@exemplo.com',
    dataNascimento: '15/08/1990',
    senha: 'senha123',
  }

  it('aceita dados válidos (sem CEP no fluxo profissional)', () => {
    expect(sobreProfissionalSchema.safeParse(SOBRE_VALIDO).success).toBe(true)
  })

  it('rejeita CPF inválido', () => {
    expect(
      sobreProfissionalSchema.safeParse({ ...SOBRE_VALIDO, cpf: '111.111.111-11' }).success,
    ).toBe(false)
  })
})
