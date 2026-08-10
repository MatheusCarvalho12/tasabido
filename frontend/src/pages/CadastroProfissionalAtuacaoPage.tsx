import {
  Baby,
  Buildings,
  Certificate,
  GraduationCap,
  MapPin,
  Monitor,
  Person,
  PersonSimple,
  Scroll,
  Student,
} from '@phosphor-icons/react'
import { useForm, useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'

import cenaProfissional from '@/assets/cena-profissional.png'
import { CadastroTextField } from '@/components/cadastro/CadastroTextField'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { CondicaoChips } from '@/components/cadastro/CondicaoChips'
import { MultiChipGroup } from '@/components/cadastro/profissional/MultiChipGroup'
import { PillSelect } from '@/components/ui/select'
import {
  CNPJ_MASK,
  CONSELHOS,
  FAIXAS_ETARIAS,
  labelRegiao,
  MODALIDADES_ATENDIMENTO,
  maxLengthNumeroRegistro,
  numeroRegistroMask,
  opcoesRegiao,
  PASSOS_CADASTRO_PROFISSIONAL,
  placeholderNumeroRegistro,
  placeholderRegiao,
  REGRA_NUMERO_REGISTRO,
} from '@/lib/cadastro-profissional'
import {
  documentoProfissionalSchema,
  MSG_CONFERE_REGISTRO,
  MSG_CONSELHO,
  MSG_REGIAO,
  validateCnpj,
  validateNumeroRegistro,
} from '@/lib/validation-profissional'
import { useCadastroProfissionalStore } from '@/stores/useCadastroProfissionalStore'
import type { Conselho } from '@/types/cadastro-profissional'

/** Metade da largura no desktop — Conselho+Número / UF+CNPJ (grid 2+2). */
const GRID_METADE = 'col-span-12 lg:col-span-6'

/** Ícones das faixas etárias no mesmo estilo dos chips de condições. */
const FAIXAS_COM_ICONE: { id: string; label: string; icon: ReactNode }[] = FAIXAS_ETARIAS.map(
  (faixa) => {
    const iconMap: Record<string, ReactNode> = {
      '0-3': <Baby weight="fill" aria-hidden="true" className="size-6 shrink-0 text-turquoise" />,
      '4-6': (
        <PersonSimple weight="fill" aria-hidden="true" className="size-6 shrink-0 text-purple" />
      ),
      '7-10': <Student weight="fill" aria-hidden="true" className="size-6 shrink-0 text-blue" />,
      '11-14': (
        <GraduationCap weight="fill" aria-hidden="true" className="size-6 shrink-0 text-coral" />
      ),
      '15+': <Person weight="fill" aria-hidden="true" className="size-6 shrink-0 text-yellow" />,
    }
    return { id: faixa.value, label: faixa.label, icon: iconMap[faixa.value] }
  },
)

/** Ícones das modalidades de atendimento. */
const ATENDIMENTO_COM_ICONE: { id: string; label: string; icon: ReactNode }[] =
  MODALIDADES_ATENDIMENTO.map((modalidade) => {
    const iconMap: Record<string, ReactNode> = {
      presencial: (
        <MapPin weight="fill" aria-hidden="true" className="size-6 shrink-0 text-turquoise" />
      ),
      online: <Monitor weight="fill" aria-hidden="true" className="size-6 shrink-0 text-purple" />,
    }
    return { id: modalidade.value, label: modalidade.label, icon: iconMap[modalidade.value] }
  })

/**
 * Passo 3 do cadastro profissional — "Sua atuação". Seções: documento
 * profissional (conselho + registro + UF + CNPJ opcional), especialidades
 * (chips reutilizados do familiar), faixa etária e modalidade de atendimento.
 */
export function CadastroProfissionalAtuacaoPage() {
  const navigate = useNavigate()
  const especialidades = useCadastroProfissionalStore((state) => state.especialidades)
  const faixas = useCadastroProfissionalStore((state) => state.faixas)
  const atendimento = useCadastroProfissionalStore((state) => state.atendimento)
  const setDocumento = useCadastroProfissionalStore((state) => state.setDocumento)
  const setEspecialidades = useCadastroProfissionalStore((state) => state.setEspecialidades)
  const setFaixas = useCadastroProfissionalStore((state) => state.setFaixas)
  const setAtendimento = useCadastroProfissionalStore((state) => state.setAtendimento)

  const form = useForm({
    defaultValues: (() => {
      const state = useCadastroProfissionalStore.getState()
      return {
        conselho: state.conselho ?? '',
        numeroRegistro: state.numeroRegistro,
        uf: state.uf ?? '',
        cnpj: state.cnpj,
      }
    })(),
    onSubmit: ({ value }) => {
      setDocumento({
        conselho: (value.conselho || null) as Conselho | null,
        numeroRegistro: value.numeroRegistro,
        uf: value.uf || null,
        cnpj: value.cnpj,
      })
      void navigate({ to: '/cadastro/profissional/finalizar' })
    },
  })

  /** Passo válido de verdade (schema zod) → habilita o botão Continuar. */
  const passoValido = useStore(
    form.store,
    (state) => documentoProfissionalSchema.safeParse(state.values).success,
  )

  /** Conselho selecionado → placeholder dinâmico do número do registro. */
  const conselhoSelecionado = useStore(form.store, (state) => state.values.conselho)

  /**
   * Aviso humanizado quando o número do registro não cabe na regra do novo
   * conselho e o campo é limpo (ex.: 7 dígitos do "Outro" → CRM 4–6).
   */
  const [avisoRegistro, setAvisoRegistro] = useState<string | null>(null)

  /** Troca de conselho: limpa o número do registro se ele não couber na nova regra. */
  const aoTrocarConselho = (conselho: string) => {
    const regra = REGRA_NUMERO_REGISTRO[conselho as Conselho]
    const digitos = form.state.values.numeroRegistro.replace(/\D/g, '')
    if (regra && digitos.length > 0 && (digitos.length < regra.min || digitos.length > regra.max)) {
      form.setFieldValue('numeroRegistro', '')
      setAvisoRegistro(MSG_CONFERE_REGISTRO)
    }
    // UF/região: se o valor atual não existe nas opções do novo conselho, limpa.
    const ufAtual = form.state.values.uf
    if (ufAtual && !opcoesRegiao(conselho).some((opcao) => opcao.value === ufAtual)) {
      form.setFieldValue('uf', '')
    }
  }

  return (
    <CadastroWizardLayout
      currentStep={3}
      title="Sua atuação"
      subtitle="Conta como você trabalha com as crianças"
      backTo="/cadastro/profissional/sobre"
      bubbleText="Quem você atende?"
      continueDisabled={!passoValido}
      onContinue={() => {
        void form.handleSubmit()
      }}
      steps={PASSOS_CADASTRO_PROFISSIONAL}
      sceneSrc={cenaProfissional}
      sceneAlt="Psicóloga, médico, terapeuta e o mascote Sabidinho em um momento de cuidado"
      trustLabel="Feito com carinho para profissionais"
      loginTo="/login/profissional"
    >
      <form
        noValidate
        aria-label="Sua atuação"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
        className="flex w-full flex-col gap-7"
      >
        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">Documento profissional</legend>
          <p className="-mt-2 font-semibold text-navy/70">
            O registro no seu conselho é obrigatório. O CNPJ é só se você tiver.
          </p>

          <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12">
            <form.Field
              name="conselho"
              validators={{
                onChange: () => undefined,
                onBlur: ({ value }) => (value ? undefined : MSG_CONSELHO),
                onSubmit: ({ value }) => (value ? undefined : MSG_CONSELHO),
              }}
            >
              {(field) => (
                <div className={GRID_METADE}>
                  <PillSelect
                    id={field.name}
                    name={field.name}
                    label="Conselho profissional"
                    placeholder="Conselho"
                    icon={
                      <Certificate
                        weight="fill"
                        aria-hidden="true"
                        className="size-6 text-purple"
                      />
                    }
                    options={CONSELHOS}
                    value={field.state.value || null}
                    onValueChange={(conselho) => {
                      aoTrocarConselho(conselho)
                      field.handleChange(conselho)
                    }}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="numeroRegistro"
              validators={{
                onChange: ({ value }) =>
                  value ? validateNumeroRegistro(value, conselhoSelecionado) : undefined,
                onBlur: ({ value }) => validateNumeroRegistro(value, conselhoSelecionado),
                onSubmit: ({ value }) => validateNumeroRegistro(value, conselhoSelecionado),
              }}
            >
              {(field) => (
                <div className={GRID_METADE}>
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="Número do registro"
                    placeholder={placeholderNumeroRegistro(conselhoSelecionado)}
                    icon={
                      <Scroll weight="fill" aria-hidden="true" className="size-6 text-turquoise" />
                    }
                    inputMode={
                      conselhoSelecionado === 'crefito' || conselhoSelecionado === 'crfa'
                        ? 'text'
                        : 'numeric'
                    }
                    autoComplete="off"
                    mask={numeroRegistroMask(conselhoSelecionado)}
                    maxLength={maxLengthNumeroRegistro(conselhoSelecionado)}
                    value={field.state.value}
                    onChange={(value) => {
                      setAvisoRegistro(null)
                      field.handleChange(value)
                    }}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                    hint={avisoRegistro ?? undefined}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="uf"
              validators={{
                onChange: () => undefined,
                onBlur: ({ value }) => (value ? undefined : MSG_REGIAO),
                onSubmit: ({ value }) => (value ? undefined : MSG_REGIAO),
              }}
            >
              {(field) => (
                <div className={GRID_METADE}>
                  <PillSelect
                    id={field.name}
                    name={field.name}
                    label={labelRegiao(conselhoSelecionado)}
                    placeholder={placeholderRegiao(conselhoSelecionado)}
                    icon={<MapPin weight="fill" aria-hidden="true" className="size-6 text-coral" />}
                    options={opcoesRegiao(conselhoSelecionado)}
                    value={field.state.value || null}
                    onValueChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="cnpj"
              validators={{
                onChange: ({ value }) =>
                  value.replace(/\D/g, '').length >= 14 ? validateCnpj(value) : undefined,
                onBlur: ({ value }) => validateCnpj(value),
                onSubmit: ({ value }) => validateCnpj(value),
              }}
            >
              {(field) => (
                <div className={GRID_METADE}>
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="CNPJ (opcional)"
                    placeholder="CNPJ"
                    icon={
                      <Buildings weight="fill" aria-hidden="true" className="size-6 text-blue" />
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    mask={CNPJ_MASK}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                    hint="Opcional — só se você tiver"
                  />
                </div>
              )}
            </form.Field>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">Especialidades</legend>
          <p className="-mt-2 font-semibold text-navy/70">Quais áreas você domina?</p>
          <CondicaoChips
            value={especialidades}
            onValueChange={(values) => setEspecialidades(values)}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">
            Faixa etária que atende
          </legend>
          <MultiChipGroup
            value={faixas}
            onValueChange={setFaixas}
            options={FAIXAS_COM_ICONE}
            ariaLabel="Faixa etária que atende"
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">Atendimento</legend>
          <MultiChipGroup
            value={atendimento}
            onValueChange={setAtendimento}
            options={ATENDIMENTO_COM_ICONE}
            ariaLabel="Modalidade de atendimento"
            className="lg:grid-cols-2"
          />
        </fieldset>
      </form>
    </CadastroWizardLayout>
  )
}
