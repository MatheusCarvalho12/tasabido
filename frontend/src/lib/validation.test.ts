import { describe, expect, it } from 'vitest'

import {
  MSG_CPF,
  MSG_DATA_ANTIGA,
  MSG_DATA_FUTURA,
  MSG_DATA_INVALIDA,
  MSG_EMAIL,
  MSG_IDADE,
  MSG_NOME,
  MSG_NOME_CRIANCA,
  MSG_PESO,
  MSG_SENHA,
  MSG_SENHAS,
  MSG_TELEFONE,
  sobreVoceSchema,
  sobreVoceSemConfirmacaoSchema,
  suaFamiliaSchema,
  validateChildName,
  validateCpf,
  validateDataNascimento,
  validateEmail,
  validateIdade,
  validateName,
  validatePassword,
  validatePeso,
  validatePhone,
} from '@/lib/validation'

const SOBRE_VALIDO = {
  nome: 'Ana Souza',
  cpf: '295.379.955-93',
  telefone: '(11) 98765-4321',
  email: 'ana@exemplo.com',
  dataNascimento: '15/08/1990',
  senha: 'senha123',
  confirmarSenha: 'senha123',
}

const FAMILIA_VALIDA = {
  nome: 'Bento',
  cpf: '295.379.955-93',
  dataNascimento: '10/05/2021',
  idade: '',
  peso: '12,5',
}

describe('validação de telefone (libphonenumber-js, metadata max)', () => {
  it('aceita celular válido com 11 dígitos e DDD real', () => {
    expect(validatePhone('(11) 98765-4321')).toBeUndefined()
  })

  it('aceita fixo válido com 10 dígitos e DDD real', () => {
    expect(validatePhone('(11) 2345-6789')).toBeUndefined()
  })

  it('rejeita telefone com DDD inexistente', () => {
    expect(validatePhone('(00) 98765-4321')).toBe(MSG_TELEFONE)
  })

  it('rejeita número com dígitos insuficientes', () => {
    expect(validatePhone('(11) 9876')).toBe(MSG_TELEFONE)
  })
})

describe('validação de CPF (cpf-cnpj-validator, dígitos verificadores)', () => {
  it('aceita CPF válido com máscara', () => {
    expect(validateCpf('295.379.955-93')).toBeUndefined()
  })

  it('aceita CPF válido só com dígitos', () => {
    expect(validateCpf('29537995593')).toBeUndefined()
  })

  it('rejeita CPF com dígitos verificadores errados', () => {
    expect(validateCpf('123.456.789-00')).toBe(MSG_CPF)
  })

  it('rejeita CPF da blacklist (números repetidos)', () => {
    expect(validateCpf('000.000.000-00')).toBe(MSG_CPF)
  })

  it('rejeita CPF vazio (obrigatório)', () => {
    expect(validateCpf('')).toBe(MSG_CPF)
  })
})

describe('validação de e-mail (zod nativo)', () => {
  it('rejeita e-mail mal formado', () => {
    expect(validateEmail('ana@')).toBe(MSG_EMAIL)
    expect(validateEmail('ana exemplo.com')).toBe(MSG_EMAIL)
  })

  it('aceita e-mail válido', () => {
    expect(validateEmail('ana@exemplo.com')).toBeUndefined()
  })
})

describe('validação de senha', () => {
  it('rejeita senha sem número', () => {
    expect(validatePassword('abcdefgh')).toBe(MSG_SENHA)
  })

  it('rejeita senha curta', () => {
    expect(validatePassword('abc1')).toBe(MSG_SENHA)
  })

  it('aceita senha com 8+ caracteres, letra e número', () => {
    expect(validatePassword('senha123')).toBeUndefined()
  })
})

describe('validação de idade', () => {
  it('rejeita idade acima de 120', () => {
    expect(validateIdade('121')).toBe(MSG_IDADE)
  })

  it('rejeita idade não inteira ou com letras', () => {
    expect(validateIdade('12,5')).toBe(MSG_IDADE)
    expect(validateIdade('abc')).toBe(MSG_IDADE)
  })

  it('aceita idade dentro da faixa', () => {
    expect(validateIdade('0')).toBeUndefined()
    expect(validateIdade('120')).toBeUndefined()
  })
})

describe('validação de data de nascimento', () => {
  it('rejeita data futura', () => {
    expect(validateDataNascimento('12/12/2099')).toBe(MSG_DATA_FUTURA)
  })

  it('rejeita data com mais de 120 anos', () => {
    expect(validateDataNascimento('01/01/1900')).toBe(MSG_DATA_ANTIGA)
  })

  it('rejeita data inexistente no calendário', () => {
    expect(validateDataNascimento('31/02/2020')).toBe(MSG_DATA_INVALIDA)
  })

  it('aceita data válida no passado', () => {
    expect(validateDataNascimento('10/05/2021')).toBeUndefined()
  })
})

describe('validação de peso', () => {
  it('rejeita peso zero', () => {
    expect(validatePeso('0')).toBe(MSG_PESO)
  })

  it('rejeita peso acima de 300 kg', () => {
    expect(validatePeso('300,5')).toBe(MSG_PESO)
  })

  it('aceita peso com vírgula ou ponto', () => {
    expect(validatePeso('12,5')).toBeUndefined()
    expect(validatePeso('12.5')).toBeUndefined()
  })

  it('aceita peso no limite de 300 kg', () => {
    expect(validatePeso('300')).toBeUndefined()
  })
})

describe('validação de nomes', () => {
  it('rejeita nome curto', () => {
    expect(validateName('A')).toBe(MSG_NOME)
  })

  it('rejeita nome com números', () => {
    expect(validateName('Ana 123')).toBe(MSG_NOME)
  })

  it('aceita nome com acentos e espaços', () => {
    expect(validateName('José Maria')).toBeUndefined()
  })

  it('pede o nome da criança quando curto', () => {
    expect(validateChildName('B')).toBe(MSG_NOME_CRIANCA)
  })
})

describe('schema do passo 2 — Sobre você', () => {
  it('aceita o passo completo válido', () => {
    expect(sobreVoceSchema.safeParse(SOBRE_VALIDO).success).toBe(true)
  })

  it('acusa quando as senhas não batem', () => {
    const resultado = sobreVoceSchema.safeParse({ ...SOBRE_VALIDO, confirmarSenha: 'outra123' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toContain('confirmarSenha')
      expect(resultado.error.issues[0]?.message).toBe(MSG_SENHAS)
    }
  })

  it('rejeita e-mail inválido no passo completo', () => {
    const resultado = sobreVoceSchema.safeParse({ ...SOBRE_VALIDO, email: 'nao-e-email' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_EMAIL)
    }
  })

  it('rejeita CPF inválido no passo completo', () => {
    const resultado = sobreVoceSchema.safeParse({ ...SOBRE_VALIDO, cpf: '123.456.789-00' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_CPF)
    }
  })

  it('rejeita data de nascimento futura no passo completo', () => {
    const resultado = sobreVoceSchema.safeParse({
      ...SOBRE_VALIDO,
      dataNascimento: '12/12/2099',
    })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_DATA_FUTURA)
    }
  })

  it('rejeita data de nascimento com mais de 120 anos no passo completo', () => {
    const resultado = sobreVoceSchema.safeParse({
      ...SOBRE_VALIDO,
      dataNascimento: '01/01/1900',
    })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_DATA_ANTIGA)
    }
  })

  it('aceita data de nascimento válida no passo completo', () => {
    expect(sobreVoceSchema.safeParse(SOBRE_VALIDO).success).toBe(true)
  })
})

describe('schema do passo 3 — Sua família', () => {
  it('aceita a família válida', () => {
    expect(suaFamiliaSchema.safeParse(FAMILIA_VALIDA).success).toBe(true)
  })

  it('rejeita data futura no passo completo', () => {
    const resultado = suaFamiliaSchema.safeParse({
      ...FAMILIA_VALIDA,
      dataNascimento: '01/01/2099',
    })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_DATA_FUTURA)
    }
  })

  it('rejeita peso zero no passo completo', () => {
    const resultado = suaFamiliaSchema.safeParse({ ...FAMILIA_VALIDA, peso: '0' })
    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toBe(MSG_PESO)
    }
  })
})

describe('schema do passo 2 sem confirmação (usado no passo 4)', () => {
  it('aceita os dados salvos na store', () => {
    const resultado = sobreVoceSemConfirmacaoSchema.safeParse({
      nome: SOBRE_VALIDO.nome,
      cpf: SOBRE_VALIDO.cpf,
      telefone: SOBRE_VALIDO.telefone,
      email: SOBRE_VALIDO.email,
      dataNascimento: SOBRE_VALIDO.dataNascimento,
      senha: SOBRE_VALIDO.senha,
    })
    expect(resultado.success).toBe(true)
  })
})
