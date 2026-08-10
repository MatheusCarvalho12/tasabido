import {
  Baby,
  Envelope,
  IdentificationCard,
  Phone,
  PuzzlePiece,
  User,
  UsersThree,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { PAPEIS_FAMILIARES } from '@/components/cadastro/papeis'
import { labelCondicao, labelRedeApoio } from '@/lib/cadastro'
import { cn } from '@/lib/utils'
import { useCadastroStore } from '@/stores/useCadastroStore'

interface ResumoRow {
  icon: ReactNode
  label: string
  value: string
}

/** Resumo do cadastro no passo 4: papel com avatar + linhas com ícones. */
export function ResumoCard() {
  const { papel, nome, cpf, telefone, email, crianca, redeApoio } = useCadastroStore()

  const papelOption = PAPEIS_FAMILIARES.find((option) => option.id === papel)

  const criancaResumo = [
    crianca.nome,
    crianca.idade ? `${crianca.idade} anos` : null,
    crianca.peso ? `${crianca.peso} kg` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const rows: ResumoRow[] = [
    {
      icon: <User weight="fill" aria-hidden="true" className="size-6 text-yellow" />,
      label: 'Nome',
      value: nome || '—',
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
      icon: <Baby weight="fill" aria-hidden="true" className="size-6 text-yellow" />,
      label: 'Criança',
      value: criancaResumo || '—',
    },
    {
      icon: <PuzzlePiece weight="fill" aria-hidden="true" className="size-6 text-purple" />,
      label: 'Condições',
      value: crianca.condicoes.map(labelCondicao).join(', ') || '—',
    },
    {
      icon: <UsersThree weight="fill" aria-hidden="true" className="size-6 text-coral" />,
      label: 'Rede de apoio',
      value: redeApoio.map(labelRedeApoio).join(', ') || '—',
    },
  ]

  return (
    <section
      aria-label="Resumo do cadastro"
      className="w-full rounded-3xl bg-white p-5 shadow-clay-white sm:p-6"
    >
      <div className="flex items-center gap-3 border-b border-border pb-4">
        {papelOption ? (
          <img
            src={papelOption.avatar}
            alt=""
            draggable={false}
            className="h-12 w-12 object-contain"
          />
        ) : (
          <User weight="fill" aria-hidden="true" className="size-12 text-turquoise" />
        )}
        <p className="text-lg font-bold text-navy sm:text-xl">{papelOption?.label ?? 'Família'}</p>
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
