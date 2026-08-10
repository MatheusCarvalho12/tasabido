import { describe, expect, it } from 'vitest'

import { buildRegisterPayload, type RegisterStateSource } from '@/lib/cadastro'

/** Estado da store com todos os dados do wizard (papel + passos 2 e 3). */
const WIZARD: RegisterStateSource = {
  papel: 'mamae',
  nome: 'Ana Souza',
  cpf: '295.379.955-93',
  telefone: '(11) 98765-4321',
  email: 'ana@exemplo.com',
  dataNascimento: '15/08/1990',
  senha: 'senha123',
  crianca: {
    nome: 'Bento',
    cpf: '295.379.955-93',
    dataNascimento: '10/05/2021',
    peso: '12,5',
    condicoes: ['tea'],
  },
  redeApoio: ['papai', 'outro-familiar'],
}

describe('buildRegisterPayload (POST /auth/register)', () => {
  it('envia o birth_date do responsável em YYYY-MM-DD (não mais null)', () => {
    const payload = buildRegisterPayload(WIZARD)
    expect(payload.birth_date).toBe('1990-08-15')
  })

  it('mantém o birth_date da criança em YYYY-MM-DD', () => {
    const payload = buildRegisterPayload(WIZARD)
    expect(payload.children[0]?.birth_date).toBe('2021-05-10')
  })

  it('converte os campos de texto e envia a estrutura completa', () => {
    const payload = buildRegisterPayload(WIZARD)
    expect(payload).toMatchObject({
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      role: 'family',
      family_role: 'mamae',
      cpf: '295.379.955-93',
      phone: '(11) 98765-4321',
      support_network: ['papai', 'outro'],
    })
    expect(payload.children[0]?.weight_kg).toBe(12.5)
  })

  it('envia birth_date null quando a data do responsável não foi preenchida', () => {
    const payload = buildRegisterPayload({ ...WIZARD, dataNascimento: '' })
    expect(payload.birth_date).toBeNull()
  })
})
