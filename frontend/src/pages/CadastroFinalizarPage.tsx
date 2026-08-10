import { Warning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { ResumoCard } from '@/components/cadastro/ResumoCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiRequestError, registerApi } from '@/lib/api'
import { saveAuth } from '@/lib/auth'
import { buildRegisterPayload } from '@/lib/cadastro'
import { useCadastroStore } from '@/stores/useCadastroStore'

function messageForError(error: Error): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) {
      return 'Este e-mail já está cadastrado. Que tal entrar?'
    }
    if (error.status === 422) {
      return 'Confira os dados e tente de novo.'
    }
  }
  return 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo em instantes.'
}

/**
 * Passo 4 do cadastro familiar — "Finalizar". Resumo dos dados + criação
 * da conta (POST /auth/register) com login automático → home.
 */
export function CadastroFinalizarPage() {
  const navigate = useNavigate()
  const wizard = useCadastroStore()
  const [formError, setFormError] = useState<string | null>(null)

  const registerMutation = useMutation({
    mutationFn: () => registerApi(buildRegisterPayload(wizard)),
    onSuccess: (data) => {
      saveAuth(data.access_token, data.user, true)
      void navigate({ to: '/' })
    },
    onError: (error: Error) => {
      setFormError(messageForError(error))
    },
  })

  const handleCriarConta = () => {
    setFormError(null)
    registerMutation.mutate()
  }

  return (
    <CadastroWizardLayout
      currentStep={4}
      title="Finalizar"
      subtitle="Tá quase tudo pronto"
      backTo="/cadastro/familia"
      bubbleText="Bem-vindo à nossa turma!"
      continueLabel={registerMutation.isPending ? 'Criando conta…' : 'Criar conta'}
      continueDisabled={registerMutation.isPending}
      onContinue={handleCriarConta}
    >
      <ResumoCard />

      {formError && (
        <Alert
          variant="destructive"
          className="w-full rounded-2xl border-transparent bg-coral/10 px-4 py-3"
        >
          <Warning weight="fill" aria-hidden="true" className="mt-0.5 size-5 text-coral-dark" />
          <AlertDescription className="font-semibold text-coral-dark">
            {formError === 'Este e-mail já está cadastrado. Que tal entrar?' ? (
              <>
                Este e-mail já está cadastrado.{' '}
                <Link
                  to="/login"
                  className="underline decoration-coral-dark/40 underline-offset-4 hover:decoration-coral-dark"
                >
                  Que tal entrar?
                </Link>
              </>
            ) : (
              formError
            )}
          </AlertDescription>
        </Alert>
      )}
    </CadastroWizardLayout>
  )
}
