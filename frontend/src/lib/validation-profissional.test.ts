import { describe, expect, it } from 'vitest'

import {
  documentoProfissionalSchema,
  MSG_CNPJ,
  MSG_CONSELHO,
  MSG_REGISTRO,
  MSG_REGISTRO_CURTO,
  MSG_UF,
  msgRegistroMaximo,
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
      numeroRegistro: '',
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

  it('rejeita número curto para o conselho escolhido', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crp',
      numeroRegistro: '123',
      uf: 'SP',
      cnpj: '',
    })
    expect(resultado.success).toBe(false)
    const mensagens = (resultado.error?.issues ?? []).map((issue) => issue.message)
    expect(mensagens).toContain(MSG_REGISTRO_CURTO)
  })

  it('rejeita número longo para CRM (máx 6) mas aceita o mesmo número em Outro (máx 10)', () => {
    const crmLongo = documentoProfissionalSchema.safeParse({
      conselho: 'crm',
      numeroRegistro: '1234567',
      uf: 'SP',
      cnpj: '',
    })
    expect(crmLongo.success).toBe(false)
    const mensagens = (crmLongo.error?.issues ?? []).map((issue) => issue.message)
    expect(mensagens).toContain(msgRegistroMaximo(6, 'crm'))

    const outroOk = documentoProfissionalSchema.safeParse({
      conselho: 'outro',
      numeroRegistro: '1234567',
      uf: 'SP',
      cnpj: '',
    })
    expect(outroOk.success).toBe(true)
  })

  it('aceita os extremos de cada regra (4 e 6 dígitos; Outro até 10)', () => {
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'crm',
        numeroRegistro: '1234',
        uf: 'SP',
        cnpj: '',
      }).success,
    ).toBe(true)
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'cro',
        numeroRegistro: '123456',
        uf: 'SP',
        cnpj: '',
      }).success,
    ).toBe(true)
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'outro',
        numeroRegistro: '1234567890',
        uf: 'SP',
        cnpj: '',
      }).success,
    ).toBe(true)
  })
})

describe('validação do número do registro (regra por conselho)', () => {
  it('rejeita vazio com a pergunta do registro', () => {
    expect(validateNumeroRegistro('', 'crm')).toBe(MSG_REGISTRO)
    expect(validateNumeroRegistro('')).toBe(MSG_REGISTRO)
  })

  it('rejeita menos de 4 dígitos em todos os conselhos', () => {
    for (const conselho of ['crm', 'crp', 'crefito', 'crfa', 'cro', 'outro']) {
      expect(validateNumeroRegistro('123', conselho)).toBe(MSG_REGISTRO_CURTO)
    }
  })

  it('aceita 4–6 dígitos nos conselhos padrão', () => {
    expect(validateNumeroRegistro('1234', 'crm')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'crm')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crp')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crefito')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crfa')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'cro')).toBeUndefined()
  })

  it('rejeita mais de 6 dígitos nos conselhos padrão, citando o conselho', () => {
    expect(validateNumeroRegistro('1234567', 'crm')).toBe(msgRegistroMaximo(6, 'crm'))
    expect(validateNumeroRegistro('1234567', 'crfa')).toBe(msgRegistroMaximo(6, 'crfa'))
  })

  it('"Outro" aceita até 10 dígitos', () => {
    expect(validateNumeroRegistro('1234567890', 'outro')).toBeUndefined()
    expect(validateNumeroRegistro('12345678901', 'outro')).toBe(msgRegistroMaximo(10, 'outro'))
  })

  it('sem conselho usa a regra padrão (4–6)', () => {
    expect(validateNumeroRegistro('1234')).toBeUndefined()
    expect(validateNumeroRegistro('1234567')).toBe(msgRegistroMaximo(6))
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
