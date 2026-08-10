import type { MaskOptions } from '@react-input/mask'

import { toIsoDate } from '@/lib/cadastro'
import type {
  Conselho,
  Profissao,
  RegisterProfessionalRequest,
} from '@/types/cadastro-profissional'

/** Rótulos dos 4 passos do cadastro profissional (mockup aprovado). */
export const PASSOS_CADASTRO_PROFISSIONAL = [
  'Quem é você?',
  'Sobre você',
  'Sua atuação',
  'Finalizar',
]

/** Máscara fixa de CNPJ: 00.000.000/0000-00 (14 dígitos). */
export const CNPJ_MASK: MaskOptions = {
  mask: '__.___.___/____-__',
  replacement: { _: /\d/ },
}

/** Máscara do número do registro: somente dígitos, até 10 (sem letras/espaços/símbolos). */
export const NUMERO_REGISTRO_MASK: MaskOptions = {
  mask: '__________',
  replacement: { _: /\d/ },
}

/** Exemplo de número de registro por conselho — só dígitos, sem barras. */
const EXEMPLO_NUMERO_REGISTRO: Record<string, string> = {
  crm: 'ex.: 123456',
  crp: 'ex.: 123456',
  crefito: 'ex.: 123456',
  crfa: 'ex.: 123456',
  cro: 'ex.: 123456',
  outro: 'ex.: 123456',
}

/** Placeholder dinâmico do número de registro conforme o conselho escolhido. */
export function placeholderNumeroRegistro(conselho: Conselho | string | null | undefined): string {
  return EXEMPLO_NUMERO_REGISTRO[conselho ?? ''] ?? 'ex.: 123456'
}

/** As 27 UFs brasileiras, na ordem oficial (dropdown do registro). */
export const UFS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
]

/** Conselhos com os rótulos exatos do mockup (ordem do dropdown). */
export const CONSELHOS: { value: Conselho; label: string }[] = [
  { value: 'crm', label: 'CRM' },
  { value: 'crp', label: 'CRP' },
  { value: 'crefito', label: 'CREFITO' },
  { value: 'crfa', label: 'CRFa' },
  { value: 'cro', label: 'CRO' },
  { value: 'outro', label: 'Outro' },
]

/** Faixas etárias atendidas (passo 3), no contrato da API. */
export const FAIXAS_ETARIAS = [
  { value: '0-3', label: '0-3 anos' },
  { value: '4-6', label: '4-6 anos' },
  { value: '7-10', label: '7-10 anos' },
  { value: '11-14', label: '11-14 anos' },
  { value: '15+', label: '15+ anos' },
]

/** Modalidades de atendimento (passo 3), no contrato da API. */
export const MODALIDADES_ATENDIMENTO = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
]

/** Rótulo humanizado de uma profissão. */
export function labelProfissao(id: Profissao): string {
  const labels: Record<Profissao, string> = {
    psicologo: 'Psicólogo(a)',
    psiquiatra: 'Psiquiatra',
    terapeuta_ocupacional: 'Terapeuta ocupacional',
    fonoaudiologo: 'Fonoaudiólogo(a)',
    pediatra: 'Pediatra',
    neuropediatra: 'Neuropediatra',
    psicopedagogo: 'Psicopedagogo(a)',
    outro: 'Outro profissional',
  }
  return labels[id]
}

/** Rótulo humanizado de um conselho (CRM, CRP, …). */
export function labelConselho(id: Conselho): string {
  return CONSELHOS.find((option) => option.value === id)?.label ?? id
}

/** Rótulo humanizado de uma faixa etária (0-3 anos, 4-6 anos, …). */
export function labelFaixa(value: string): string {
  return FAIXAS_ETARIAS.find((option) => option.value === value)?.label ?? value
}

/** Rótulo humanizado de uma modalidade de atendimento. */
export function labelAtendimento(value: string): string {
  return MODALIDADES_ATENDIMENTO.find((option) => option.value === value)?.label ?? value
}

export interface RegisterProfissionalStateSource {
  profissao: Profissao | null
  nome: string
  cpf: string
  dataNascimento: string
  telefone: string
  email: string
  senha: string
  conselho: Conselho | null
  numeroRegistro: string
  uf: string | null
  cnpj: string
  especialidades: string[]
  faixas: string[]
  atendimento: string[]
  lgpdConsent: boolean
}

/** Monta o corpo do POST /auth/register a partir da store do wizard. */
export function buildRegisterProfissionalPayload(
  state: RegisterProfissionalStateSource,
): RegisterProfessionalRequest {
  const cnpjDigitos = state.cnpj.replace(/\D/g, '')

  return {
    name: state.nome.trim(),
    email: state.email.trim(),
    password: state.senha,
    role: 'professional',
    cpf: state.cpf.trim(),
    phone: state.telefone.trim(),
    birth_date: toIsoDate(state.dataNascimento),
    lgpd_consent: state.lgpdConsent,
    profession: state.profissao ?? 'outro',
    council_type: state.conselho ?? 'outro',
    council_number: state.numeroRegistro.trim(),
    council_uf: state.uf ?? '',
    cnpj: cnpjDigitos.length === 14 ? cnpjDigitos : null,
    specialties: state.especialidades,
    age_groups: state.faixas,
    service_modes: state.atendimento,
  }
}
