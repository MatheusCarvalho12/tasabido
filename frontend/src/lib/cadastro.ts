import type { MaskOptions } from '@react-input/mask'

import type { Condicao, PapelFamiliar, RegisterRequest } from '@/types/cadastro'

/** Máscara fixa de CPF: 000.000.000-00 (11 dígitos). */
export const CPF_MASK: MaskOptions = {
  mask: '___.___.___-__',
  replacement: { _: /\d/ },
}

/** Rótulos humanizados das condições (ordem do mockup). */
export const LABELS_CONDICOES: Record<Condicao, string> = {
  tea: 'TEA',
  tdah: 'TDAH',
  dislexia: 'Dislexia',
  tod: 'TOD',
  atraso_fala: 'Atraso de fala',
  outra: 'Outra',
}

export function labelCondicao(condicao: Condicao): string {
  return LABELS_CONDICOES[condicao]
}

/** Rótulo humanizado de um papel/apoio (Mamãe, Papai, …). */
export function labelRedeApoio(id: PapelFamiliar): string {
  const labels: Record<PapelFamiliar, string> = {
    mamae: 'Mamãe',
    papai: 'Papai',
    vovo: 'Vovó',
    'vovo-m': 'Vovô',
    responsavel: 'Responsável',
    'outro-familiar': 'Outro familiar',
  }
  return labels[id]
}

/** Enum do contrato da API: 'outro-familiar' (UI) vira 'outro' (backend). */
export function toSupportNetworkEnum(id: PapelFamiliar): string {
  return id === 'outro-familiar' ? 'outro' : id
}

/** Converte dd/mm/aaaa em Date. Retorna null quando inválida. */
export function parseBrDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/** Formata Date como dd/mm/aaaa. */
export function formatBrDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getFullYear()}`
}

/** Data no formato dd/mm/aaaa → ISO (yyyy-mm-dd) ou null. */
export function toIsoDate(value: string): string | null {
  const date = parseBrDate(value)
  if (!date) {
    return null
  }
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Idade em anos completos a partir da data de nascimento. */
export function calcAge(date: Date): number {
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const birthdayThisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate())
  if (now < birthdayThisYear) {
    age -= 1
  }
  return age
}

/** Aplica a máscara dd/mm/aaaa conforme o usuário digita. */
export function maskBrDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) {
    return digits
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export interface RegisterStateSource {
  papel: PapelFamiliar | null
  nome: string
  cpf: string
  telefone: string
  email: string
  dataNascimento: string
  senha: string
  crianca: {
    nome: string
    cpf: string
    dataNascimento: string
    peso: string
    condicoes: Condicao[]
  }
  redeApoio: PapelFamiliar[]
}

/** Monta o corpo do POST /auth/register a partir da store do wizard. */
export function buildRegisterPayload(state: RegisterStateSource): RegisterRequest {
  const pesoBruto = state.crianca.peso.trim()
  const peso = pesoBruto ? Number(pesoBruto.replace(',', '.')) : null

  return {
    name: state.nome.trim(),
    email: state.email.trim(),
    password: state.senha,
    role: 'family',
    family_role: state.papel ?? 'outro-familiar',
    cpf: state.cpf.trim(),
    phone: state.telefone.trim(),
    birth_date: toIsoDate(state.dataNascimento),
    children: [
      {
        name: state.crianca.nome.trim(),
        cpf: state.crianca.cpf.trim(),
        birth_date: toIsoDate(state.crianca.dataNascimento),
        weight_kg: Number.isFinite(peso) ? peso : null,
        conditions: state.crianca.condicoes,
      },
    ],
    support_network: state.redeApoio.map(toSupportNetworkEnum),
  }
}
