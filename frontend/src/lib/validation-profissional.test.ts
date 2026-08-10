import { describe, expect, it } from 'vitest'

import {
  documentoProfissionalSchema,
  MSG_CNPJ,
  MSG_CONSELHO,
  MSG_REGIAO,
  MSG_REGISTRO,
  MSG_REGISTRO_CREFITO_FORMATO,
  MSG_REGISTRO_CRFA_FORMATO,
  MSG_REGISTRO_CURTO,
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
  it('exige conselho, número do registro e UF/região', () => {
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
    expect(mensagens).toContain(MSG_REGIAO)
  })

  it('aceita documento completo com CNPJ válido', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crp',
      numeroRegistro: '12345',
      uf: '06',
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
      numeroRegistro: '9876-F',
      uf: '3',
      cnpj: '',
    })
    expect(resultado.success).toBe(true)
  })

  it('rejeita número curto para o conselho escolhido', () => {
    const resultado = documentoProfissionalSchema.safeParse({
      conselho: 'crp',
      numeroRegistro: '123',
      uf: '06',
      cnpj: '',
    })
    expect(resultado.success).toBe(false)
    const mensagens = (resultado.error?.issues ?? []).map((issue) => issue.message)
    expect(mensagens).toContain(MSG_REGISTRO_CURTO)
  })

  it('rejeita número longo para CRM (máx 7) mas aceita o mesmo número em Outro (máx 10)', () => {
    const crmLongo = documentoProfissionalSchema.safeParse({
      conselho: 'crm',
      numeroRegistro: '12345678',
      uf: 'SP',
      cnpj: '',
    })
    expect(crmLongo.success).toBe(false)
    const mensagens = (crmLongo.error?.issues ?? []).map((issue) => issue.message)
    expect(mensagens).toContain(msgRegistroMaximo(7, 'crm'))

    const outroOk = documentoProfissionalSchema.safeParse({
      conselho: 'outro',
      numeroRegistro: '12345678',
      uf: 'SP',
      cnpj: '',
    })
    expect(outroOk.success).toBe(true)
  })

  it('aceita os extremos de cada regra (4–7 no CRM; 4–6 demais; Outro até 10)', () => {
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'crm',
        numeroRegistro: '1234567',
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

  it('aceita CREFITO com sufixo -F/-TO e CRFa com formato região-número', () => {
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'crefito',
        numeroRegistro: '123456-F',
        uf: '3',
        cnpj: '',
      }).success,
    ).toBe(true)
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'crefito',
        numeroRegistro: '1234-TO',
        uf: '3',
        cnpj: '',
      }).success,
    ).toBe(true)
    expect(
      documentoProfissionalSchema.safeParse({
        conselho: 'crfa',
        numeroRegistro: '2-12345',
        uf: '2',
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

  it('aceita 4–6 dígitos nos conselhos padrão e até 7 no CRM', () => {
    expect(validateNumeroRegistro('1234', 'crm')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'crm')).toBeUndefined()
    expect(validateNumeroRegistro('1234567', 'crm')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crp')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crefito')).toBeUndefined()
    expect(validateNumeroRegistro('12345', 'crfa')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'cro')).toBeUndefined()
  })

  it('rejeita mais dígitos do que a regra, citando o conselho (CRM máx 7)', () => {
    expect(validateNumeroRegistro('12345678', 'crm')).toBe(msgRegistroMaximo(7, 'crm'))
    expect(validateNumeroRegistro('1234567', 'crfa')).toBe(msgRegistroMaximo(6, 'crfa'))
    expect(validateNumeroRegistro('1234567', 'crefito')).toBe(msgRegistroMaximo(6, 'crefito'))
  })

  it('"Outro" aceita até 10 dígitos', () => {
    expect(validateNumeroRegistro('1234567890', 'outro')).toBeUndefined()
    expect(validateNumeroRegistro('12345678901', 'outro')).toBe(msgRegistroMaximo(10, 'outro'))
  })

  it('sem conselho usa a regra padrão (4–7)', () => {
    expect(validateNumeroRegistro('1234')).toBeUndefined()
    expect(validateNumeroRegistro('1234567')).toBeUndefined()
    expect(validateNumeroRegistro('12345678')).toBe(msgRegistroMaximo(7))
  })
})

describe('validação do CREFITO (sufixo -F/-TO)', () => {
  it('aceita número puro com 4–6 dígitos', () => {
    expect(validateNumeroRegistro('1234', 'crefito')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'crefito')).toBeUndefined()
  })

  it('aceita sufixo -F e -TO', () => {
    expect(validateNumeroRegistro('123456-F', 'crefito')).toBeUndefined()
    expect(validateNumeroRegistro('12345-F', 'crefito')).toBeUndefined()
    expect(validateNumeroRegistro('1234-TO', 'crefito')).toBeUndefined()
  })

  it('rejeita sufixo errado ou hífen sozinho', () => {
    expect(validateNumeroRegistro('123456-FO', 'crefito')).toBe(MSG_REGISTRO_CREFITO_FORMATO)
    expect(validateNumeroRegistro('12345-T', 'crefito')).toBe(MSG_REGISTRO_CREFITO_FORMATO)
    expect(validateNumeroRegistro('12345-', 'crefito')).toBe(MSG_REGISTRO_CREFITO_FORMATO)
    expect(validateNumeroRegistro('12345-X', 'crefito')).toBe(MSG_REGISTRO_CREFITO_FORMATO)
  })

  it('rejeita quantidade de dígitos fora da regra mesmo com sufixo', () => {
    expect(validateNumeroRegistro('123-F', 'crefito')).toBe(MSG_REGISTRO_CURTO)
    expect(validateNumeroRegistro('1234567-F', 'crefito')).toBe(msgRegistroMaximo(6, 'crefito'))
  })
})

describe('validação do CRFa (região-número ou número puro)', () => {
  it('aceita número puro com 4–6 dígitos', () => {
    expect(validateNumeroRegistro('1234', 'crfa')).toBeUndefined()
    expect(validateNumeroRegistro('123456', 'crfa')).toBeUndefined()
  })

  it('aceita formato região-número (R-NNNNN)', () => {
    expect(validateNumeroRegistro('2-12345', 'crfa')).toBeUndefined()
    expect(validateNumeroRegistro('9-123456', 'crfa')).toBeUndefined()
    expect(validateNumeroRegistro('12-345678', 'crfa')).toBeUndefined()
  })

  it('rejeita hífen no lugar errado ou quantidade fora da regra', () => {
    expect(validateNumeroRegistro('12345-2', 'crfa')).toBe(MSG_REGISTRO_CRFA_FORMATO)
    expect(validateNumeroRegistro('2-123', 'crfa')).toBe(MSG_REGISTRO_CRFA_FORMATO)
    expect(validateNumeroRegistro('2-12', 'crfa')).toBe(MSG_REGISTRO_CURTO)
    expect(validateNumeroRegistro('1234567', 'crfa')).toBe(msgRegistroMaximo(6, 'crfa'))
    expect(validateNumeroRegistro('2-1234567', 'crfa')).toBe(msgRegistroMaximo(6, 'crfa'))
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
