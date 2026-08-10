import type { LoginResponse } from '@/types/auth'

/** Papéis possíveis no cadastro familiar (passo 1 — "Quem é você?"). */
export type PapelFamiliar = 'mamae' | 'papai' | 'vovo' | 'vovo-m' | 'responsavel' | 'outro-familiar'

export interface PapelFamiliarOption {
  id: PapelFamiliar
  label: string
  avatar: string
}

/** Condições de desenvolvimento da criança (passo 3 — chips multi-seleção). */
export type Condicao = 'tea' | 'tdah' | 'dislexia' | 'tod' | 'atraso_fala' | 'outra'

/** Dados da criança coletados no passo 3. Datas em dd/mm/aaaa, pesos como texto. */
export interface Crianca {
  nome: string
  cpf: string
  dataNascimento: string
  peso: string
  /** Condições: ids padrão ('tea', 'tdah', …) ou textos customizados (chips "Outra"). */
  condicoes: string[]
}

export interface RegisterChildRequest {
  name: string
  cpf: string
  birth_date: string | null
  weight_kg: number | null
  /** Condições como strings: ids padrão ('tea', 'tdah', …) ou textos custom. */
  conditions: string[]
}

/** Contrato POST /auth/register (papel família). */
export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: 'family'
  family_role: PapelFamiliar
  cpf: string
  phone: string
  birth_date: string | null
  /** CEP do responsável (opcional; apenas dígitos, 8). */
  cep?: string
  /** Consentimento LGPD (obrigatório para família). */
  lgpd_consent: boolean
  children: RegisterChildRequest[]
  support_network: string[]
}

export type RegisterResponse = LoginResponse
