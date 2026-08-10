import { useNavigate } from '@tanstack/react-router'

import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { PapelGrid } from '@/components/cadastro/PapelGrid'
import { PAPEIS_FAMILIARES } from '@/components/cadastro/papeis'
import { useCadastroStore } from '@/stores/useCadastroStore'

export function CadastroPage() {
  const navigate = useNavigate()
  const papel = useCadastroStore((state) => state.papel)
  const setPapel = useCadastroStore((state) => state.setPapel)

  const handleContinuar = () => {
    if (!papel) return
    void navigate({ to: '/cadastro/sobre' })
  }

  return (
    <CadastroWizardLayout
      currentStep={1}
      title="Criar conta da família"
      subtitle="Vamos começar entendendo como você faz parte dessa história."
      bubbleText="Eu vou te ajudar em cada etapa."
      continueDisabled={!papel}
      onContinue={handleContinuar}
    >
      <PapelGrid value={papel} onValueChange={setPapel} options={PAPEIS_FAMILIARES} />
    </CadastroWizardLayout>
  )
}
