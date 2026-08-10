import { describe, expect, it } from 'vitest'
import type { RegisterProfissionalStateSource } from '@/lib/cadastro-profissional'
import {
  buildRegisterProfissionalPayload,
  labelConselho,
  labelFaixa,
  labelProfissao,
  labelRegiao,
  normalizeRegiao,
  opcoesRegiao,
  placeholderNumeroRegistro,
  placeholderRegiao,
  REGIOES_CREFITO,
  REGIOES_CRFA,
  REGIOES_CRP,
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
  uf: '06',
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
      council_region: '06',
      cnpj: '12345678000195',
      specialties: ['tea', 'atraso_fala'],
      age_groups: ['4-6', '7-10'],
      service_modes: ['presencial', 'online'],
    })
  })

  it('normaliza a região do CRP com zero à esquerda ("6" → "06")', () => {
    const payload = buildRegisterProfissionalPayload({ ...ESTADO_VALIDO, uf: '6' })
    expect(payload.council_region).toBe('06')
  })

  it('mantém a UF como está para conselhos que usam UF', () => {
    const payload = buildRegisterProfissionalPayload({
      ...ESTADO_VALIDO,
      conselho: 'crm',
      uf: 'SP',
    })
    expect(payload.council_region).toBe('SP')
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
    expect(payload.council_region).toBe('')
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
    expect(placeholderNumeroRegistro('crefito')).toBe('ex.: 123456-F')
    expect(placeholderNumeroRegistro('crfa')).toBe('ex.: 2-12345')
    expect(placeholderNumeroRegistro('cro')).toBe('ex.: 12345')
    expect(placeholderNumeroRegistro('outro')).toBe('ex.: 123456')
  })

  it('sem conselho usa o padrão', () => {
    expect(placeholderNumeroRegistro(null)).toBe('ex.: 123456')
    expect(placeholderNumeroRegistro(undefined)).toBe('ex.: 123456')
  })

  it('regra de dígitos: CRM até 7, demais 4–6, Outro até 10', () => {
    expect(REGRA_NUMERO_REGISTRO.crm).toEqual({ min: 4, max: 7 })
    expect(REGRA_NUMERO_REGISTRO.crp).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.crefito).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.crfa).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.cro).toEqual({ min: 4, max: 6 })
    expect(REGRA_NUMERO_REGISTRO.outro).toEqual({ min: 4, max: 10 })
  })
})

describe('UF/região do registro por conselho', () => {
  it('CRP: 23 regiões com UF de referência (06 = SP)', () => {
    expect(REGIOES_CRP).toHaveLength(23)
    expect(REGIOES_CRP.find((opcao) => opcao.value === '06')?.label).toBe('06 (SP)')
  })

  it('CREFITO: 21 regiões com UFs de abrangência (3 = SP)', () => {
    expect(REGIOES_CREFITO).toHaveLength(21)
    expect(REGIOES_CREFITO.find((opcao) => opcao.value === '3')?.label).toBe('3 (SP)')
  })

  it('CRFa: 9 regiões com UFs de abrangência (2 = SP)', () => {
    expect(REGIOES_CRFA).toHaveLength(9)
    expect(REGIOES_CRFA.find((opcao) => opcao.value === '2')?.label).toBe('2 (SP)')
  })

  it('opcoesRegiao: UF (27) para crm/cro/outro e região para crp/crefito/crfa', () => {
    expect(opcoesRegiao('crm')).toHaveLength(27)
    expect(opcoesRegiao('crm')[0]).toEqual({ value: 'AC', label: 'AC' })
    expect(opcoesRegiao(null)).toHaveLength(27)
    expect(opcoesRegiao('crp')[0]).toEqual({ value: '01', label: '01 (DF)' })
    expect(opcoesRegiao('crefito')[1]).toEqual({ value: '2', label: '2 (RJ)' })
    expect(opcoesRegiao('crfa')[1]).toEqual({ value: '2', label: '2 (SP)' })
  })

  it('labelRegiao e placeholderRegiao mudam conforme o conselho', () => {
    expect(labelRegiao('crm')).toBe('UF do registro')
    expect(labelRegiao(null)).toBe('UF do registro')
    expect(labelRegiao('crp')).toBe('Região do CRP')
    expect(labelRegiao('crefito')).toBe('Região do CREFITO')
    expect(labelRegiao('crfa')).toBe('Região do CRFa')
    expect(placeholderRegiao('crm')).toBe('UF')
    expect(placeholderRegiao('crp')).toBe('Região')
  })

  it('normalizeRegiao: CRP com zero à esquerda; demais conselhos mantêm o valor', () => {
    expect(normalizeRegiao('6', 'crp')).toBe('06')
    expect(normalizeRegiao('06', 'crp')).toBe('06')
    expect(normalizeRegiao('SP', 'crm')).toBe('SP')
    expect(normalizeRegiao('3', 'crefito')).toBe('3')
    expect(normalizeRegiao('', 'crp')).toBe('')
    expect(normalizeRegiao(null, 'crp')).toBe('')
  })
})
