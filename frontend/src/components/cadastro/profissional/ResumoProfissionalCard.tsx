import {
  Baby,
  Buildings,
  Certificate,
  Envelope,
  IdentificationCard,
  MapPin,
  Phone,
  PuzzlePiece,
  User,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { PROFISSOES } from '@/components/cadastro/profissional/profissoes'
import { labelCondicao } from '@/lib/cadastro'
import {
  labelAtendimento,
  labelConselho,
  labelFaixa,
  labelProfissao,
} from '@/lib/cadastro-profissional'
import { cn } from '@/lib/utils'
import { useCadastroProfissionalStore } from '@/stores/useCadastroProfissionalStore'

interface ResumoRow {
  icon: ReactNode
  label: string
  value: string
}

/** Resumo do cadastro profissional no passo 4: profissão com avatar + linhas. */
export function ResumoProfissionalCard() {
  const {
    profissao,
    nome,
    cpf,
    telefone,
    email,
    conselho,
    numeroRegistro,
    uf,
    cnpj,
    especialidades,
    faixas,
    atendimento,
  } = useCadastroProfissionalStore()

  const profissaoOption = PROFISSOES.find((option) => option.id === profissao)

  const documento = conselho
    ? `${labelConselho(conselho)} ${numeroRegistro}${uf ? ` · ${uf}` : ''}`
    : '—'

  const rows: ResumoRow[] = [
    {
      icon: <User weight="fill" aria-hidden="true" className="size-6 text-yellow" />,
      label: 'Nome',
      value: nome || '—',
    },
    {
      icon: <Certificate weight="fill" aria-hidden="true" className="size-6 text-purple" />,
      label: 'Documento profissional',
      value: documento,
    },
    {
      icon: <Buildings weight="fill" aria-hidden="true" className="size-6 text-coral" />,
      label: 'CNPJ',
      value: cnpj || '—',
    },
    {
      icon: <IdentificationCard weight="fill" aria-hidden="true" className="size-6 text-coral" />,
      label: 'CPF',
      value: cpf || '—',
    },
    {
      icon: <Phone weight="fill" aria-hidden="true" className="size-6 text-turquoise" />,
      label: 'Telefone',
      value: telefone || '—',
    },
    {
      icon: <Envelope weight="fill" aria-hidden="true" className="size-6 text-purple" />,
      label: 'E-mail',
      value: email || '—',
    },
    {
      icon: <PuzzlePiece weight="fill" aria-hidden="true" className="size-6 text-turquoise" />,
      label: 'Especialidades',
      value: especialidades.map(labelCondicao).join(', ') || '—',
    },
    {
      icon: <Baby weight="fill" aria-hidden="true" className="size-6 text-yellow" />,
      label: 'Faixas etárias',
      value: faixas.map(labelFaixa).join(', ') || '—',
    },
    {
      icon: <MapPin weight="fill" aria-hidden="true" className="size-6 text-coral" />,
      label: 'Atendimento',
      value: atendimento.map(labelAtendimento).join(', ') || '—',
    },
  ]

  return (
    <section
      aria-label="Resumo do cadastro"
      className="w-full rounded-3xl bg-white p-5 shadow-clay-white sm:p-6"
    >
      <div className="flex items-center gap-3 border-b border-border pb-4">
        {profissaoOption ? (
          <img
            src={profissaoOption.avatar}
            alt=""
            draggable={false}
            className="h-12 w-12 object-contain"
          />
        ) : (
          <User weight="fill" aria-hidden="true" className="size-12 text-turquoise" />
        )}
        <p className="text-lg font-bold text-navy sm:text-xl">
          {profissao ? labelProfissao(profissao) : 'Profissional'}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map(({ icon, label, value }) => (
          <li key={label} className="flex items-center gap-3 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-cream">
              {icon}
            </span>
            <span className={cn('text-sm font-bold text-navy sm:text-base')}>{label}</span>
            <span className="ml-auto max-w-[55%] text-right text-sm font-semibold text-navy/70 sm:text-base">
              {value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
