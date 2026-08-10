import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Crianca, PapelFamiliar } from '@/types/cadastro'

interface CadastroState {
  /** Papel selecionado no passo 1. `null` enquanto nada foi escolhido. */
  papel: PapelFamiliar | null
  nome: string
  cpf: string
  telefone: string
  email: string
  dataNascimento: string
  senha: string
  /** CEP do responsável (passo 2), com máscara 00000-000. */
  cep: string
  /** Consentimento LGPD marcado no passo 4. */
  lgpdConsent: boolean
  crianca: Crianca
  redeApoio: PapelFamiliar[]
  setPapel: (papel: PapelFamiliar) => void
  setSobre: (
    sobre: Pick<
      CadastroState,
      'nome' | 'cpf' | 'telefone' | 'email' | 'dataNascimento' | 'senha' | 'cep'
    >,
  ) => void
  setLgpdConsent: (lgpdConsent: boolean) => void
  setCrianca: (crianca: Partial<Crianca>) => void
  setRedeApoio: (redeApoio: PapelFamiliar[]) => void
  resetCadastro: () => void
}

const DEFAULT_CRIANCA: Crianca = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  peso: '',
  condicoes: [],
}

/**
 * Estado compartilhado do fluxo de cadastro familiar (persiste entre passos).
 * Persistido no sessionStorage: sobrevive ao F5, some ao fechar a aba.
 */
export const useCadastroStore = create<CadastroState>()(
  persist(
    (set) => ({
      papel: null,
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      dataNascimento: '',
      senha: '',
      cep: '',
      lgpdConsent: false,
      crianca: { ...DEFAULT_CRIANCA },
      redeApoio: [],
      setPapel: (papel) => set({ papel }),
      setSobre: (sobre) => set(sobre),
      setLgpdConsent: (lgpdConsent) => set({ lgpdConsent }),
      setCrianca: (crianca) => set((state) => ({ crianca: { ...state.crianca, ...crianca } })),
      setRedeApoio: (redeApoio) => set({ redeApoio }),
      resetCadastro: () =>
        set({
          papel: null,
          nome: '',
          cpf: '',
          telefone: '',
          email: '',
          dataNascimento: '',
          senha: '',
          cep: '',
          lgpdConsent: false,
          crianca: { ...DEFAULT_CRIANCA },
          redeApoio: [],
        }),
    }),
    {
      name: 'tasabido.cadastro',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
