import { Baby, CalendarBlank, IdentificationCard, Scales } from '@phosphor-icons/react'
import { useForm, useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { CadastroTextField } from '@/components/cadastro/CadastroTextField'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { CondicaoChips } from '@/components/cadastro/CondicaoChips'
import { DateField } from '@/components/cadastro/DateField'
import { RedeApoioChips } from '@/components/cadastro/RedeApoioChips'
import { CPF_MASK, calcAge, parseBrDate } from '@/lib/cadastro'
import {
  suaFamiliaSchema,
  validateChildName,
  validateCpf,
  validateDataNascimento,
  validateIdade,
  validatePeso,
} from '@/lib/validation'
import { useCadastroStore } from '@/stores/useCadastroStore'
import type { Condicao, PapelFamiliar } from '@/types/cadastro'

/**
 * Passo 3 do cadastro familiar — "Sua família". Seções: a criança
 * (dados + condições) e a rede de apoio (quem mais participa do cuidado).
 */
export function CadastroFamiliaPage() {
  const navigate = useNavigate()
  const criancaDaStore = useCadastroStore((state) => state.crianca)
  const redeApoio = useCadastroStore((state) => state.redeApoio)
  const setCrianca = useCadastroStore((state) => state.setCrianca)
  const setRedeApoio = useCadastroStore((state) => state.setRedeApoio)

  const form = useForm({
    defaultValues: (() => {
      const state = useCadastroStore.getState()
      return {
        nome: state.crianca.nome,
        cpf: state.crianca.cpf,
        dataNascimento: state.crianca.dataNascimento,
        idade: state.crianca.idade,
        peso: state.crianca.peso,
      }
    })(),
    onSubmit: ({ value }) => {
      // Idade calculada automaticamente quando a data foi preenchida e o campo está livre.
      const date = parseBrDate(value.dataNascimento)
      const idadeFinal = value.idade.trim() ? value.idade : date ? String(calcAge(date)) : ''
      setCrianca({
        nome: value.nome,
        cpf: value.cpf,
        dataNascimento: value.dataNascimento,
        idade: idadeFinal,
        peso: value.peso,
      })
      void navigate({ to: '/cadastro/finalizar' })
    },
  })

  /** Passo válido de verdade (schema zod) → habilita o botão Continuar. */
  const passoValido = useStore(
    form.store,
    (state) => suaFamiliaSchema.safeParse(state.values).success,
  )

  return (
    <CadastroWizardLayout
      currentStep={3}
      title="Sua família"
      subtitle="Conta pra gente quem vai brincar com a gente"
      backTo="/cadastro/sobre"
      bubbleText="A gente cuida junto, tá?"
      continueDisabled={!passoValido}
      onContinue={() => {
        void form.handleSubmit()
      }}
    >
      <form
        noValidate
        aria-label="Sua família"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
        className="flex w-full flex-col gap-7"
      >
        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">A criança</legend>

          <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12">
            <form.Field
              name="nome"
              validators={{
                onChange: ({ value }) => (value ? validateChildName(value) : undefined),
                onBlur: ({ value }) => validateChildName(value),
                onSubmit: ({ value }) => validateChildName(value),
              }}
            >
              {(field) => (
                <div className="col-span-12">
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="Nome da criança"
                    placeholder="Nome da criança"
                    icon={
                      <Baby weight="fill" aria-hidden="true" className="size-6 text-turquoise" />
                    }
                    autoComplete="off"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="cpf"
              validators={{
                onChange: ({ value }) =>
                  value.replace(/\D/g, '').length >= 11 ? validateCpf(value) : undefined,
                onBlur: ({ value }) => validateCpf(value),
                onSubmit: ({ value }) => validateCpf(value),
              }}
            >
              {(field) => (
                <div className="col-span-12 lg:col-span-6">
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="CPF da criança"
                    placeholder="CPF"
                    icon={
                      <IdentificationCard
                        weight="fill"
                        aria-hidden="true"
                        className="size-6 text-purple"
                      />
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    mask={CPF_MASK}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="dataNascimento"
              validators={{
                onChange: ({ value }) => (value ? validateDataNascimento(value) : undefined),
                onBlur: ({ value }) => validateDataNascimento(value),
                onSubmit: ({ value }) => validateDataNascimento(value),
              }}
            >
              {(field) => (
                <div className="col-span-12 lg:col-span-6">
                  <DateField
                    id={field.name}
                    name={field.name}
                    label="Data de nascimento"
                    value={field.state.value}
                    onChange={(value) => {
                      field.handleChange(value)
                      // Quando a data completa sai do picker e a idade está livre,
                      // calcula na hora (apenas datas passadas — futura fica inválida).
                      const date = parseBrDate(value)
                      if (date && date <= new Date() && !form.state.values.idade.trim()) {
                        form.setFieldValue('idade', String(calcAge(date)))
                      }
                    }}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="idade"
              validators={{
                onChange: ({ value }) => (value ? validateIdade(value) : undefined),
                onBlur: ({ value }) => validateIdade(value),
                onSubmit: ({ value }) => validateIdade(value),
              }}
            >
              {(field) => (
                <div className="col-span-12 lg:col-span-4">
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="Idade"
                    placeholder="Idade"
                    icon={
                      <CalendarBlank
                        weight="fill"
                        aria-hidden="true"
                        className="size-6 text-purple"
                      />
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>

            <form.Field
              name="peso"
              validators={{
                onChange: ({ value }) => (value ? validatePeso(value) : undefined),
                onBlur: ({ value }) => validatePeso(value),
                onSubmit: ({ value }) => validatePeso(value),
              }}
            >
              {(field) => (
                <div className="col-span-12 lg:col-span-4">
                  <CadastroTextField
                    id={field.name}
                    name={field.name}
                    label="Peso"
                    placeholder="Peso"
                    icon={
                      <Scales weight="fill" aria-hidden="true" className="size-6 text-turquoise" />
                    }
                    inputMode="decimal"
                    autoComplete="off"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    error={field.state.meta.errors[0]}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <p className="pt-1 text-base font-bold text-navy sm:text-lg">Como ela se desenvolve?</p>
          <CondicaoChips
            value={criancaDaStore.condicoes}
            onValueChange={(condicoes) => setCrianca({ condicoes } as { condicoes: Condicao[] })}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="text-lg font-bold text-navy sm:text-xl">Rede de apoio</legend>
          <p className="-mt-2 font-semibold text-navy/70">Quem mais participa do cuidado?</p>
          <RedeApoioChips
            value={redeApoio}
            onValueChange={(values) => setRedeApoio(values as PapelFamiliar[])}
          />
        </fieldset>
      </form>
    </CadastroWizardLayout>
  )
}
