import type { MaskOptions, ModifiedData } from '@react-input/mask'

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

/**
 * Máscara do número do CREFITO: 4–6 dígitos + sufixo opcional -F/-TO.
 * O hífen entra automaticamente quando o sufixo começa; sem sufixo, o campo
 * aceita só dígitos (a máscara base é trocada via `modify`, em tempo de digitação).
 * Os slots '#'/'*' precisam entrar no `replacement` junto com a máscara —
 * senão o filtro da lib descarta o sufixo (slot sem regex = caractere bloqueado).
 */
const SUFIXO_CREFITO: ModifiedData = {
  mask: '______-#*',
  replacement: { _: /\d/, '#': /[FT]/, '*': /[O]/ },
}

const CREFITO_NUMERO_MASK: MaskOptions = {
  mask: '______',
  replacement: { _: /\d/ },
  modify: (data) => {
    if (data.inputType !== 'insert' || !data.data) {
      return data.value.includes('-') ? SUFIXO_CREFITO : undefined
    }
    const digitos = (data.value.match(/\d/g) ?? []).length
    // Mais um dígito: amplia a máscara (4→5→6 slots).
    if (/^\d$/.test(data.data) && digitos < 6) {
      return { ...SUFIXO_CREFITO, mask: `${'_'.repeat(digitos + 1)}-#*` }
    }
    // Começo do sufixo (F/TO): o hífen é inserido pela máscara.
    if (/^[FT]$/.test(data.data) && digitos >= 4 && digitos <= 6) {
      return { ...SUFIXO_CREFITO, mask: `${'_'.repeat(digitos)}-#*` }
    }
    return data.value.includes('-') ? SUFIXO_CREFITO : undefined
  },
}

/**
 * Máscara do número do CRFa: região-número ("2-12345") ou dígitos puros.
 * O hífen entra automaticamente após a 1ª região; a validação aceita os dois formatos.
 */
const CRFA_NUMERO_MASK: MaskOptions = {
  mask: '_-______',
  replacement: { _: /\d/ },
}

/**
 * Máscara do número do registro por conselho (@react-input/mask):
 * - crm/crp/cro/outro → só dígitos, até o máximo da regra;
 * - crefito → dígitos 4–6 + sufixo opcional -F/-TO;
 * - crfa → região-número ("2-12345") ou dígitos puros.
 */
export function numeroRegistroMask(conselho: Conselho | string | null | undefined): MaskOptions {
  const chave = conselho as Conselho
  if (chave === 'crefito') {
    return CREFITO_NUMERO_MASK
  }
  if (chave === 'crfa') {
    return CRFA_NUMERO_MASK
  }
  const max = REGRA_NUMERO_REGISTRO[chave]?.max ?? REGRA_NUMERO_REGISTRO.crm.max
  return { mask: '_'.repeat(max), replacement: { _: /\d/ } }
}

/** Comprimento máximo do campo do número do registro por conselho (com sufixo/hífen). */
export function maxLengthNumeroRegistro(conselho: Conselho | string | null | undefined): number {
  const MAX_CARACTERES: Record<Conselho, number> = {
    crm: 7,
    crp: 6,
    crefito: 9, // 6 dígitos + "-TO"
    crfa: 8, // região + "-" + 6 dígitos
    cro: 6,
    outro: 10,
  }
  return MAX_CARACTERES[conselho as Conselho] ?? MAX_CARACTERES.crm
}

/** Exemplo de número de registro por conselho — sem barras (mockup aprovado). */
const EXEMPLO_NUMERO_REGISTRO: Record<string, string> = {
  crm: 'ex.: 123456',
  crp: 'ex.: 12345',
  crefito: 'ex.: 123456-F',
  crfa: 'ex.: 2-12345',
  cro: 'ex.: 12345',
  outro: 'ex.: 123456',
}

/**
 * Regra de dígitos do número do registro por conselho (mín–máx).
 * CRM aceita até 7; demais conselhos 4–6; "Outro" aceita até 10.
 */
export const REGRA_NUMERO_REGISTRO: Record<Conselho, { min: number; max: number }> = {
  crm: { min: 4, max: 7 },
  crp: { min: 4, max: 6 },
  crefito: { min: 4, max: 6 },
  crfa: { min: 4, max: 6 },
  cro: { min: 4, max: 6 },
  outro: { min: 4, max: 10 },
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

/**
 * Regiões do CRP 01–23 com a UF de referência (fonte: site oficial do CFP,
 * "Conselhos pelo Brasil" — sedes regionais; CRP-10 abrange PA/AP).
 */
export const REGIOES_CRP: { value: string; label: string }[] = [
  { value: '01', label: '01 (DF)' },
  { value: '02', label: '02 (PE)' },
  { value: '03', label: '03 (BA)' },
  { value: '04', label: '04 (MG)' },
  { value: '05', label: '05 (RJ)' },
  { value: '06', label: '06 (SP)' },
  { value: '07', label: '07 (RS)' },
  { value: '08', label: '08 (PR)' },
  { value: '09', label: '09 (GO)' },
  { value: '10', label: '10 (PA/AP)' },
  { value: '11', label: '11 (CE)' },
  { value: '12', label: '12 (SC)' },
  { value: '13', label: '13 (PB)' },
  { value: '14', label: '14 (MS)' },
  { value: '15', label: '15 (AL)' },
  { value: '16', label: '16 (ES)' },
  { value: '17', label: '17 (RN)' },
  { value: '18', label: '18 (MT)' },
  { value: '19', label: '19 (SE)' },
  { value: '20', label: '20 (AM)' },
  { value: '21', label: '21 (PI)' },
  { value: '22', label: '22 (MA)' },
  { value: '23', label: '23 (TO)' },
]

/** Regiões do CREFITO 1–21 com as UFs de abrangência (fonte: coffito.gov.br). */
export const REGIOES_CREFITO: { value: string; label: string }[] = [
  { value: '1', label: '1 (PE/PB/AL/RN)' },
  { value: '2', label: '2 (RJ)' },
  { value: '3', label: '3 (SP)' },
  { value: '4', label: '4 (MG)' },
  { value: '5', label: '5 (RS)' },
  { value: '6', label: '6 (CE)' },
  { value: '7', label: '7 (BA)' },
  { value: '8', label: '8 (PR)' },
  { value: '9', label: '9 (MT)' },
  { value: '10', label: '10 (SC)' },
  { value: '11', label: '11 (DF)' },
  { value: '12', label: '12 (PA/TO/AP)' },
  { value: '13', label: '13 (MS)' },
  { value: '14', label: '14 (PI)' },
  { value: '15', label: '15 (ES)' },
  { value: '16', label: '16 (MA)' },
  { value: '17', label: '17 (SE)' },
  { value: '18', label: '18 (RO/AC)' },
  { value: '19', label: '19 (GO)' },
  { value: '20', label: '20 (AM/RR)' },
  { value: '21', label: '21 (PB)' },
]

/** Regiões do CRFa 1–9 com as UFs de abrangência (fonte: fonoaudiologia.org.br). */
export const REGIOES_CRFA: { value: string; label: string }[] = [
  { value: '1', label: '1 (RJ)' },
  { value: '2', label: '2 (SP)' },
  { value: '3', label: '3 (PR/SC)' },
  { value: '4', label: '4 (AL/BA/PB/PE/SE)' },
  { value: '5', label: '5 (DF/GO/MS/MT/TO)' },
  { value: '6', label: '6 (ES/MG)' },
  { value: '7', label: '7 (RS)' },
  { value: '8', label: '8 (CE/MA/PI/RN)' },
  { value: '9', label: '9 (AC/AM/AP/PA/RO/RR)' },
]

/**
 * Opções do segundo campo do documento profissional (dropdown) conforme o conselho:
 * UF (27) para crm/cro/outro; região numérica para crp/crefito/crfa.
 */
export function opcoesRegiao(
  conselho: Conselho | string | null | undefined,
): { value: string; label: string }[] {
  const chave = conselho as Conselho
  if (chave === 'crp') {
    return REGIOES_CRP
  }
  if (chave === 'crefito') {
    return REGIOES_CREFITO
  }
  if (chave === 'crfa') {
    return REGIOES_CRFA
  }
  return UFS.map((uf) => ({ value: uf, label: uf }))
}

/** Rótulo do segundo campo conforme o conselho ("UF do registro" / "Região do CRP" / …). */
export function labelRegiao(conselho: Conselho | string | null | undefined): string {
  const chave = conselho as Conselho
  if (chave === 'crp') {
    return 'Região do CRP'
  }
  if (chave === 'crefito') {
    return 'Região do CREFITO'
  }
  if (chave === 'crfa') {
    return 'Região do CRFa'
  }
  return 'UF do registro'
}

/** Placeholder do segundo campo conforme o conselho ("UF" / "Região"). */
export function placeholderRegiao(conselho: Conselho | string | null | undefined): string {
  const chave = conselho as Conselho
  return chave === 'crp' || chave === 'crefito' || chave === 'crfa' ? 'Região' : 'UF'
}

/** Normaliza a região para o payload: CRP sempre com zero à esquerda ("6" → "06"). */
export function normalizeRegiao(
  regiao: string | null | undefined,
  conselho?: Conselho | string | null,
): string {
  const valor = (regiao ?? '').trim()
  if (!valor) {
    return ''
  }
  return conselho === 'crp' ? valor.padStart(2, '0') : valor
}

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
    council_region: normalizeRegiao(state.uf, state.conselho),
    cnpj: cnpjDigitos.length === 14 ? cnpjDigitos : null,
    specialties: state.especialidades,
    age_groups: state.faixas,
    service_modes: state.atendimento,
  }
}
