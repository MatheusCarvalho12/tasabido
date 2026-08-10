import { CalendarBlank, Envelope, Phone, User } from '@phosphor-icons/react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { PasswordField } from '@/components/auth/PasswordField'
import { CadastroTextField } from '@/components/cadastro/CadastroTextField'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import {
  validateEmail,
  validateIdade,
  validateName,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
} from '@/lib/validation'
import { useCadastroStore } from '@/stores/useCadastroStore'

const GRID = 'col-span-12'
const GRID_TELEFONE = 'col-span-12 lg:col-span-8'
const GRID_IDADE = 'col-span-12 lg:col-span-4'
const GRID_SENHA = 'col-span-12 lg:col-span-6'

/**
 * Passo 2 do cadastro familiar — "Sobre você". Formulário em grid:
 * nome (total), telefone 2/3 + idade 1/3, e-mail (total), senha + confirmação 1/2.
 */
export function CadastroSobrePage() {
  const navigate = useNavigate()
  const setSobre = useCadastroStore((state) => state.setSobre)

  const form = useForm({
    defaultValues: (() => {
      const state = useCadastroStore.getState()
      return {
        nome: state.nome,
        telefone: state.telefone,
        email: state.email,
        idade: state.idade,
        senha: state.senha,
        confirmarSenha: state.senha,
      }
    })(),
    onSubmit: ({ value }) => {
      setSobre({
        nome: value.nome,
        telefone: value.telefone,
        email: value.email,
        idade: value.idade,
        senha: value.senha,
      })
      void navigate({ to: '/cadastro/familia' })
    },
  })

  return (
    <CadastroWizardLayout
      currentStep={2}
      title="Sobre você"
      subtitle="Conta pra gente quem é você"
      backTo="/cadastro"
      bubbleText="Quase lá! Falta pouco pra gente começar."
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
            <div className={`${GRID} order-1 lg:order-none`}>
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
          name="telefone"
          validators={{
            onChange: ({ value }) => (value ? validatePhone(value) : undefined),
            onBlur: ({ value }) => validatePhone(value),
            onSubmit: ({ value }) => validatePhone(value),
          }}
        >
          {(field) => (
            <div className={`${GRID} ${GRID_TELEFONE} order-2 lg:order-2`}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="Telefone"
                placeholder="Telefone"
                icon={<Phone weight="fill" aria-hidden="true" className="size-6 text-turquoise" />}
                inputMode="tel"
                autoComplete="tel"
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
            <div className={`${GRID} order-3 lg:order-4`}>
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
          name="idade"
          validators={{
            onChange: ({ value }) => (value ? validateIdade(value) : undefined),
            onBlur: ({ value }) => validateIdade(value),
            onSubmit: ({ value }) => validateIdade(value),
          }}
        >
          {(field) => (
            <div className={`${GRID} ${GRID_IDADE} order-4 lg:order-3`}>
              <CadastroTextField
                id={field.name}
                name={field.name}
                label="Idade"
                placeholder="Idade"
                icon={
                  <CalendarBlank weight="fill" aria-hidden="true" className="size-6 text-purple" />
                }
                inputMode="numeric"
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
            <div className={`${GRID} ${GRID_SENHA} order-5 lg:order-5`}>
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
            <div className={`${GRID} ${GRID_SENHA} order-6 lg:order-6`}>
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
