import { useNavigate } from '@tanstack/react-router'

import cenaProfissional from '@/assets/cena-profissional.png'
import { CadastroWizardLayout } from '@/components/cadastro/CadastroWizardLayout'
import { ProfissaoGrid } from '@/components/cadastro/profissional/ProfissaoGrid'
import { PROFISSOES } from '@/components/cadastro/profissional/profissoes'
import { PASSOS_CADASTRO_PROFISSIONAL } from '@/lib/cadastro-profissional'
import { useCadastroProfissionalStore } from '@/stores/useCadastroProfissionalStore'
import type { Profissao } from '@/types/cadastro-profissional'

/**
 * Passo 1 do cadastro profissional — "Quem é você?". Grid 4x2 (desktop) /
 * 2x4 (mobile) com as 8 profissões; card selecionado com outline azul + check.
 */
export function CadastroProfissionalPage() {
  const navigate = useNavigate()
  const profissao = useCadastroProfissionalStore((state) => state.profissao)
  const setProfissao = useCadastroProfissionalStore((state) => state.setProfissao)

  const handleContinuar = () => {
    if (!profissao) return
    void navigate({ to: '/cadastro/profissional/sobre' })
  }

  return (
    <CadastroWizardLayout
      currentStep={1}
      title="Criar conta de profissional"
      subtitle="Conectando profissionais e famílias no cuidado de crianças neuroatípicas."
      bubbleText="Qual é a sua profissão?"
      continueDisabled={!profissao}
      onContinue={handleContinuar}
      steps={PASSOS_CADASTRO_PROFISSIONAL}
      sceneSrc={cenaProfissional}
      sceneAlt="Psicóloga, médico, terapeuta e o mascote Sabidinho em um momento de cuidado"
      trustLabel="Feito com carinho para profissionais"
      loginTo="/login/profissional"
    >
      <ProfissaoGrid
        value={profissao}
        onValueChange={(value) => setProfissao(value as Profissao)}
        options={PROFISSOES}
      />
    </CadastroWizardLayout>
  )
}
