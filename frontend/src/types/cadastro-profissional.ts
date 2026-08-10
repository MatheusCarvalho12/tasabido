import type { LoginResponse } from '@/types/auth'

/** Profissões possíveis no cadastro profissional (passo 1 — "Quem é você?"). */
export type Profissao =
  | 'psicologo'
  | 'psiquiatra'
  | 'terapeuta_ocupacional'
  | 'fonoaudiologo'
  | 'pediatra'
  | 'neuropediatra'
  | 'psicopedagogo'
  | 'outro'

export interface ProfissaoOption {
  id: Profissao
  label: string
  avatar: string
}

/** Conselhos profissionais (passo 3 — documento profissional). */
export type Conselho = 'crm' | 'crp' | 'crefito' | 'crfa' | 'cro' | 'outro'

/** Contrato POST /auth/register (papel professional). */
export interface RegisterProfessionalRequest {
  name: string
  email: string
  password: string
  role: 'professional'
  cpf: string
  phone: string
  birth_date: string | null
  lgpd_consent: boolean
  profession: Profissao
  council_type: Conselho
  council_number: string
  /** UF (crm/cro/outro) ou região numérica (crp/crefito/crfa), conforme o conselho. */
  council_region: string
  /** CNPJ opcional; apenas dígitos (14) ou null quando não informado. */
  cnpj: string | null
  /** Especialidades: ids padrão ('tea', 'tdah', …) ou textos customizados. */
  specialties: string[]
  age_groups: string[]
  service_modes: string[]
}

export type RegisterProfessionalResponse = LoginResponse
