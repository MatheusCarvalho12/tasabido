import { ArrowRight, CircleNotch, Envelope, UserPlus, Warning } from '@phosphor-icons/react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { PasswordField } from '@/components/auth/PasswordField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ApiRequestError, loginApi } from '@/lib/api'
import { validateEmail, validateLoginPassword } from '@/lib/validation'
import type { AuthRole, User } from '@/types/auth'

export interface LoginFormProps {
  onLoggedIn: (token: string, user: User, remember: boolean) => void
  /** Papel de autenticação enviado no login (ex.: 'professional'). Omitido = família. */
  authRole?: AuthRole
  /** Placeholder visível do campo de e-mail (ex.: "E-mail profissional"). */
  emailPlaceholder?: string
  /** Rótulo do botão de criar conta (ex.: "Criar conta profissional"). */
  createAccountLabel?: string
  /** Rota do botão de criar conta (profissional → /cadastro/profissional). */
  createAccountTo?: string
}

interface LoginVariables {
  email: string
  password: string
  remember: boolean
}

function messageForError(error: Error): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return 'E-mail ou senha incorretos.'
    }
    if (error.status === 422) {
      return 'Confira os dados e tente de novo.'
    }
  }
  return 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo em instantes.'
}

export function LoginForm({
  onLoggedIn,
  authRole,
  emailPlaceholder = 'E-mail',
  createAccountLabel = 'Criar conta',
  createAccountTo = '/cadastro',
}: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: LoginVariables) =>
      loginApi({ email, password, role: authRole }),
    onSuccess: (data, variables) => {
      onLoggedIn(data.access_token, data.user, variables.remember)
    },
    onError: (error: Error) => {
      setFormError(messageForError(error))
    },
  })

  const form = useForm({
    defaultValues: { email: '', password: '', remember: false },
    onSubmit: ({ value }) => {
      setFormError(null)
      loginMutation.mutate({
        email: value.email,
        password: value.password,
        remember: value.remember,
      })
    },
  })

  return (
    <form
      noValidate
      aria-busy={loginMutation.isPending}
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
      className="flex w-full flex-col gap-5"
    >
      <FieldGroup className="gap-4">
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => (value ? validateEmail(value) : undefined),
            onBlur: ({ value }) => validateEmail(value),
            onSubmit: ({ value }) => validateEmail(value),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name} className="sr-only">
                E-mail
              </FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Envelope
                    weight="fill"
                    aria-hidden="true"
                    className="absolute left-5 top-1/2 size-6 -translate-y-1/2 text-turquoise"
                  />
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={emailPlaceholder}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={
                      field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
                    }
                    className="h-14 rounded-full border-transparent bg-white pl-14 pr-5 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base"
                  />
                </div>
                <FieldError id={`${field.name}-error`} className="pl-5">
                  {field.state.meta.errors[0]}
                </FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => (value ? validateLoginPassword(value) : undefined),
            onBlur: ({ value }) => validateLoginPassword(value),
            onSubmit: ({ value }) => validateLoginPassword(value),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name} className="sr-only">
                Senha
              </FieldLabel>
              <FieldContent>
                <PasswordField
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  hasError={field.state.meta.errors.length > 0}
                  errorId={`${field.name}-error`}
                />
                <FieldError id={`${field.name}-error`} className="pl-5">
                  {field.state.meta.errors[0]}
                </FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="remember">
          {(field) => (
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={field.name}
                className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-semibold text-navy"
              >
                <Checkbox
                  id={field.name}
                  name={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                  className="size-5 rounded-[5px] border-2 border-turquoise/50 data-checked:border-turquoise data-checked:bg-turquoise"
                />
                Lembrar de mim
              </label>
              <Link
                to="/esqueci-senha"
                className="shrink-0 text-sm font-bold text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue"
              >
                Esqueci minha senha
              </Link>
            </div>
          )}
        </form.Field>
      </FieldGroup>

      {formError && (
        <Alert
          variant="destructive"
          className="rounded-2xl border-transparent bg-coral/10 px-4 py-3"
        >
          <Warning weight="fill" aria-hidden="true" className="mt-0.5 size-5 text-coral-dark" />
          <AlertDescription className="font-semibold text-coral-dark">{formError}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="group relative h-14 w-full rounded-full bg-blue px-8 text-lg font-bold text-white shadow-clay-btn transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0"
      >
        {loginMutation.isPending ? 'Entrando…' : 'Entrar'}
        <span
          aria-hidden="true"
          className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-blue shadow-clay-sm"
        >
          {loginMutation.isPending ? (
            <CircleNotch className="size-6 animate-spin motion-reduce:animate-none" />
          ) : (
            <ArrowRight
              weight="bold"
              className="size-6 transition-transform group-hover:translate-x-0.5"
            />
          )}
        </span>
      </Button>

      <Button
        type="button"
        render={<Link to={createAccountTo} />}
        variant="outline"
        className="h-14 w-full rounded-full border-transparent bg-white text-lg font-bold text-turquoise-dark shadow-clay-white transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-white hover:text-turquoise-dark active:translate-y-0"
      >
        <UserPlus
          weight="fill"
          data-icon="inline-start"
          aria-hidden="true"
          className="size-6 text-turquoise"
        />
        {createAccountLabel}
      </Button>
    </form>
  )
}
