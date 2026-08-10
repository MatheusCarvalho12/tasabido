import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Conselho, Profissao } from '@/types/cadastro-profissional'

interface CadastroProfissionalState {
  /** Profissão selecionada no passo 1. `null` enquanto nada foi escolhido. */
  profissao: Profissao | null
  nome: string
  cpf: string
  dataNascimento: string
  telefone: string
  email: string
  senha: string
  /** Conselho selecionado no passo 3 (documento profissional). */
  conselho: Conselho | null
  numeroRegistro: string
  /** UF do registro (2 letras), ex.: 'SP'. */
  uf: string | null
  /** CNPJ opcional com máscara 00.000.000/0000-00. Vazio = não informado. */
  cnpj: string
  /** Especialidades: ids padrão ('tea', 'tdah', …) ou textos customizados. */
  especialidades: string[]
  faixas: string[]
  atendimento: string[]
  /** Consentimento LGPD marcado no passo 4. */
  lgpdConsent: boolean
  setProfissao: (profissao: Profissao) => void
  setSobre: (
    sobre: Pick<
      CadastroProfissionalState,
      'nome' | 'cpf' | 'dataNascimento' | 'telefone' | 'email' | 'senha'
    >,
  ) => void
  setDocumento: (
    documento: Pick<CadastroProfissionalState, 'conselho' | 'numeroRegistro' | 'uf' | 'cnpj'>,
  ) => void
  setEspecialidades: (especialidades: string[]) => void
  setFaixas: (faixas: string[]) => void
  setAtendimento: (atendimento: string[]) => void
  setLgpdConsent: (lgpdConsent: boolean) => void
  resetCadastro: () => void
}

/**
 * Estado compartilhado do fluxo de cadastro profissional (persiste entre passos).
 * Persistido no sessionStorage: sobrevive ao F5, some ao fechar a aba.
 */
export const useCadastroProfissionalStore = create<CadastroProfissionalState>()(
  persist(
    (set) => ({
      profissao: null,
      nome: '',
      cpf: '',
      dataNascimento: '',
      telefone: '',
      email: '',
      senha: '',
      conselho: null,
      numeroRegistro: '',
      uf: null,
      cnpj: '',
      especialidades: [],
      faixas: [],
      atendimento: [],
      lgpdConsent: false,
      setProfissao: (profissao) => set({ profissao }),
      setSobre: (sobre) => set(sobre),
      setDocumento: (documento) => set(documento),
      setEspecialidades: (especialidades) => set({ especialidades }),
      setFaixas: (faixas) => set({ faixas }),
      setAtendimento: (atendimento) => set({ atendimento }),
      setLgpdConsent: (lgpdConsent) => set({ lgpdConsent }),
      resetCadastro: () =>
        set({
          profissao: null,
          nome: '',
          cpf: '',
          dataNascimento: '',
          telefone: '',
          email: '',
          senha: '',
          conselho: null,
          numeroRegistro: '',
          uf: null,
          cnpj: '',
          especialidades: [],
          faixas: [],
          atendimento: [],
          lgpdConsent: false,
        }),
    }),
    {
      name: 'tasabido.cadastro-profissional',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
