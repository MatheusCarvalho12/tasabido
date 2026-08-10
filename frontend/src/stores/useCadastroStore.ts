import { create } from 'zustand'

import type { PapelFamiliar } from '@/types/cadastro'

interface CadastroState {
  /** Papel selecionado no passo 1. `null` enquanto nada foi escolhido. */
  papel: PapelFamiliar | null
  setPapel: (papel: PapelFamiliar) => void
}

/** Estado compartilhado do fluxo de cadastro familiar (persiste entre passos). */
export const useCadastroStore = create<CadastroState>()((set) => ({
  papel: null,
  setPapel: (papel) => set({ papel }),
}))
