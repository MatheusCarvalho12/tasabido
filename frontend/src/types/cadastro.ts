/** Papéis possíveis no cadastro familiar (passo 1 — "Quem é você?"). */
export type PapelFamiliar = 'mamae' | 'papai' | 'vovo' | 'vovo-m' | 'responsavel' | 'outro-familiar'

export interface PapelFamiliarOption {
  id: PapelFamiliar
  label: string
  avatar: string
}
