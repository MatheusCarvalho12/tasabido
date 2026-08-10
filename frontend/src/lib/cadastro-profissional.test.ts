import { describe, expect, it } from 'vitest'
import type { RegisterProfissionalStateSource } from '@/lib/cadastro-profissional'
import {
  buildRegisterProfissionalPayload,
  labelConselho,
  labelFaixa,
  labelProfissao,
  placeholderNumeroRegistro,
  REGRA_NUMERO_REGISTRO,
} from '@/lib/cadastro-profissional'

const ESTADO_VALIDO: RegisterProfissionalStateSource = {
  profissao: 'psicologo',
  nome: 'Ana Souza',
  cpf: '295.379.955-93',
  dataNascimento: '15/08/1990',
  telefone: '(11) 98765-4321',
  email: 'ana@exemplo.com',
  senha: 'senha123',
  conselho: 'crp',
  numeroRegistro: '12345',
  uf: 'SP',
  cnpj: '12.345.678/0001-95',
  especialidades: ['tea', 'atraso_fala'],
  faixas: ['4-6', '7-10'],
  atendimento: ['presencial', 'online'],
  lgpdConsent: true,
}

describe('buildRegisterProfissionalPayload', () => {
  it('monta o corpo do register com role professional e enums do contrato', () => {
    const payload = buildRegisterProfissionalPayload(ESTADO_VALIDO)
    expect(payload).toEqual({
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      password: 'senha123',
      role: 'professional',
      cpf: '295.379.955-93',
      phone: '(11) 98765-4321',
      birth_date: '1990-08-15',
      lgpd_consent: true,
      profession: 'psicologo',
      council_type: 'crp',
      council_number: '12345',
      council_uf: 'SP',
      cnpj: '12345678000195',
      specialties: ['tea', 'atraso_fala'],
      age_groups: ['4-6', '7-10'],
      service_modes: ['presencial', 'online'],
    })
  })

  it('CNPJ vazio vira null (opcional)', () => {
    const payload = buildRegisterProfissionalPayload({ ...ESTADO_VALIDO, cnpj: '' })
    expect(payload.cnpj).toBeNull()
  })

  it('sem profissão/conselho usa os fallbacks do contrato', () => {
    const payload = buildRegisterProfissionalPayload({
      ...ESTADO_VALIDO,
      profissao: null,
      conselho: null,
      uf: null,
    })
    expect(payload.profession).toBe('outro')
    expect(payload.council_type).toBe('outro')
    expect(payload.council_uf).toBe('')
  })

  it('CNPJ incompleto (máscara parcial) não é enviado', () => {
    const payload = buildRegisterProfissionalPayload({ ...ESTADO_VALIDO, cnpj: '12.345.678' })
    expect(payload.cnpj).toBeNull()
  })
})

describe('rótulos humanizados', () => {
  it('labelProfissao traduz os enums do contrato', () => {
    expect(labelProfissao('terapeuta_ocupacional')).toBe('Terapeuta ocupacional')
    expect(labelProfissao('fonoaudiologo')).toBe('Fonoaudiólogo(a)')
    expect(labelProfissao('psicopedagogo')).toBe('Psicopedagogo(a)')
    expect(labelProfissao('outro')).toBe('Outro profissional')
  })

  it('labelConselho traduz os enums', () => {
    expect(labelConselho('crefito')).toBe('CREFITO')
    expect(labelConselho('crfa')).toBe('CRFa')
  })

  it('labelFaixa traduz os enums do contrato', () => {
    expect(labelFaixa('0-3')).toBe('0-3 anos')
    expect(labelFaixa('15+')).toBe('15+ anos')
  })
})

describe('número do registro por conselho', () => {
  it('placeholder segue o exemplo do mockup para cada conselho', () => {
    expect(placeholderNumeroRegistro('crm')).toBe('ex.: 123456')
    expect(placeholderNumeroRegistro('crp')).toBe('ex.: 12345')
    expect(placeholderNumeroRegistro('crefito')).toBe('ex.: 12345')
    expect(placeholderNumeroRegistro('crfa')).toBe('ex.: 12345')
    expect(placeholderNumeroRegistro('cro')).toBe('ex.: 123456')
    expect(placeholderNumeroRegistro('outro')).toBe('ex.: 123456')
  })

  it('sem conselho usa o padrão', () => {
    expect(placeholderNumeroRegistro(null)).toBe('ex.: 123456')
    expect(placeholderNumeroRegistro(undefined)).toBe('ex.: 123456')
  })

  it('regra de dígitos: 4–6 nos conselhos padrão, Outro até 10', () => {
    expect(REGRA_NUMERO_REGISTRO.crm).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.crp).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.crefito).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.crfa).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.cro).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.outro).toEqual({ min: 4, max: 10 })
  })
})
