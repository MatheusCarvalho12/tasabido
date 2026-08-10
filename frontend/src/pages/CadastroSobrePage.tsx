import { Envelope, IdentificationCard, Phone, User } from '@phosphor-icons/react'
import type { MaskOptions } from '@react-input/mask'
import { useForm, useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { PasswordField } from '@/components/auth/PasswordField'
import { CadastroTextField } from '@/components/cadastro/CadastroTextField'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { DateField } from '@/components/cadastro/DateField'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { CPF_MASK } from '@/lib/cadastro'
import {
  sobreVoceSchema,
  validateCpf,
  validateDataNascimento,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
} from '@/lib/validation'
import { useCadastroStore } from '@/stores/useCadastroStore'

const GRID = 'col-span-12'
const GRID_METADE = 'col-span-12 lg:col-span-6'

/**
 * Máscara dinâmica do telefone: (XX) XXXX-XXXX para fixo (10 dígitos) e
 * (XX) XXXXX-XXXX para celular (11 dígitos) — trocada antes de cada entrada.
 */
const TELEFONE_MASK: MaskOptions = {
  mask: '(__) ____-____',
  replacement: { _: /\d/ },
  modify: ({ value, data, inputType }) => {
    const entrada = inputType === 'insert' ? (data ?? '') : ''
    const digitos = `${value}${entrada}`.replace(/\D/g, '').length
    return { mask: digitos > 10 ? '(__) _____-____' : '(__) ____-____' }
  },
}

/**
 * Passo 2 do cadastro familiar — "Sobre você". Formulário em grid de 12 colunas
 * no desktop (1 coluna no mobile): nome (total), CPF 1/2 + data de nascimento
 * 1/2, telefone (total), e-mail (total), senha + confirmação 1/2.
 */
export function CadastroSobrePage() {
  const navigate = useNavigate()
  const setSobre = useCadastroStore((state) => state.setSobre)

  const form = useForm({
    defaultValues: (() => {
      const state = useCadastroStore.getState()
      return {
        nome: state.nome,
        cpf: state.cpf,
        telefone: state.telefone,
        email: state.email,
        dataNascimento: state.dataNascimento,
        senha: state.senha,
        confirmarSenha: state.senha,
      }
    })(),
    onSubmit: ({ value }) => {
      setSobre({
        nome: value.nome,
        cpf: value.cpf,
        telefone: value.telefone,
        email: value.email,
        dataNascimento: value.dataNascimento,
        senha: value.senha,
      })
      void navigate({ to: '/cadastro/familia' })
    },
  })

  /** Passo válido de verdade (schema zod) → habilita o botão Continuar. */
  const passoValido = useStore(
    form.store,
    (state) => sobreVoceSchema.safeParse(state.values).success,
  )

  return (
    <CadastroWizardLayout
      currentStep={2}
      title="Sobre você"
      subtitle="Conta pra gente quem é você"
      backTo="/cadastro"
      bubbleText="Quase lá! Falta pouco pra gente começar."
      continueDisabled={!passoValido}
      onContinue={() => {
        void form.handleSubmit()
      }}
    >
      <form
        noValidate
        aria-label="Sobre você"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void form.handleSubmit()
        }}
        className="grid w-full grid-cols-1 gap-4 lg:grid-cols-12"
      >
        <form.Field
          name="nome"
          validators={{
            onChange: ({ value }) => (value ? validateName(value) : undefined),
            onBlur: ({ value }) => validateName(value),
            onSubmit: ({ value }) => validateName(value),
          }}
        >
          {(field) => (
            <div className={GRID}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="Nome completo"
                placeholder="Nome completo"
                icon={<User weight="fill" aria-hidden="true" className="size-6 text-turquoise" />}
                autoComplete="name"
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
            <div className={`${GRID} ${GRID_METADE}`}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="CPF"
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
            <div className={`${GRID} ${GRID_METADE}`}>
              <DateField
                id={field.name}
                name={field.name}
                label="Data de nascimento"
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
          name="telefone"
          validators={{
            onChange: ({ value }) =>
              value.replace(/\D/g, '').length >= 10 ? validatePhone(value) : undefined,
            onBlur: ({ value }) => validatePhone(value),
            onSubmit: ({ value }) => validatePhone(value),
          }}
        >
          {(field) => (
            <div className={GRID}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="Telefone"
                placeholder="Telefone"
                icon={<Phone weight="fill" aria-hidden="true" className="size-6 text-turquoise" />}
                inputMode="tel"
                autoComplete="tel"
                mask={TELEFONE_MASK}
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
          name="email"
          validators={{
            onChange: ({ value }) => (value ? validateEmail(value) : undefined),
            onBlur: ({ value }) => validateEmail(value),
            onSubmit: ({ value }) => validateEmail(value),
          }}
        >
          {(field) => (
            <div className={GRID}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="E-mail"
                placeholder="E-mail"
                icon={
                  <Envelope weight="fill" aria-hidden="true" className="size-6 text-turquoise" />
                }
                type="email"
                inputMode="email"
                autoComplete="email"
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
          name="senha"
          validators={{
            onChange: ({ value }) => (value ? validatePassword(value) : undefined),
            onBlur: ({ value }) => validatePassword(value),
            onSubmit: ({ value }) => validatePassword(value),
          }}
        >
          {(field) => (
            <div className={`${GRID} ${GRID_METADE}`}>
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Senha
                </FieldLabel>
                <FieldContent>
                  <PasswordField
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    errorId={`${field.name}-error`}
                    autoComplete="new-password"
                  />
                  <FieldError id={`${field.name}-error`} className="pl-5">
                    {field.state.meta.errors[0]}
                  </FieldError>
                </FieldContent>
              </Field>
            </div>
          )}
        </form.Field>

        <form.Field
          name="confirmarSenha"
          validators={{
            onChange: ({ value }) =>
              value ? validatePasswordMatch(value, form.state.values.senha) : undefined,
            onBlur: ({ value }) => validatePasswordMatch(value, form.state.values.senha),
            onSubmit: ({ value }) => validatePasswordMatch(value, form.state.values.senha),
          }}
        >
          {(field) => (
            <div className={`${GRID} ${GRID_METADE}`}>
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Confirmar senha
                </FieldLabel>
                <FieldContent>
                  <PasswordField
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    hasError={field.state.meta.errors.length > 0}
                    errorId={`${field.name}-error`}
                    placeholder="Confirmar senha"
                    autoComplete="new-password"
                  />
                  <FieldError id={`${field.name}-error`} className="pl-5">
                    {field.state.meta.errors[0]}
                  </FieldError>
                </FieldContent>
              </Field>
            </div>
          )}
        </form.Field>
      </form>
    </CadastroWizardLayout>
  )
}
