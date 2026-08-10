import { Link, useNavigate } from '@tanstack/react-router'

import cenaFamilia from '@/assets/cena-familia.png'
import { AuthScene } from '@/components/auth/AuthScene'
import { ClayBlobs } from '@/components/auth/ClayBlobs'
import { TrustBadges } from '@/components/auth/TrustBadges'
import { CadastroHeader } from '@/components/cadastro/CadastroHeader'
import { CadastroProgress } from '@/components/cadastro/CadastroProgress'
import { ContinueButton } from '@/components/cadastro/ContinueButton'
import { MascotSpeechBubble, MascotSpeechRow } from '@/components/cadastro/MascotSpeechBubble'
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
    <div className="relative min-h-dvh overflow-hidden bg-cream text-navy">
      <ClayBlobs />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full animate-card-in rounded-[2rem] bg-panel shadow-clay sm:rounded-[2.5rem]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            {/* Coluna esquerda: fluxo de cadastro (mobile e desktop) */}
            <div className="flex flex-col items-center gap-6 px-6 py-9 sm:gap-7 sm:px-12 sm:py-12 lg:gap-8 lg:px-14 lg:py-14">
              <CadastroHeader
                title="Criar conta da família"
                subtitle="Vamos começar entendendo como você faz parte dessa história."
              />

              <CadastroProgress currentStep={1} />

              {/* Mobile: a cena fica entre o progresso e os cards (mockup) */}
              <div className="lg:hidden">
                <AuthScene
                  src={cenaFamilia}
                  alt="Pai, mãe, criança e o mascote Sabidinho em um abraço acolhedor"
                  className="mx-auto w-full max-w-72 sm:max-w-80"
                />
              </div>

              <PapelGrid value={papel} onValueChange={setPapel} options={PAPEIS_FAMILIARES} />

              {/* Mobile: mascote + balão ancorado (mockup) */}
              <div className="lg:hidden">
                <MascotSpeechRow />
              </div>

              <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Link
                  to="/login"
                  className="order-2 text-base font-bold whitespace-nowrap text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue lg:order-1 lg:text-lg"
                >
                  Já tenho conta
                </Link>
                <ContinueButton
                  disabled={!papel}
                  onClick={handleContinuar}
                  className="order-1 w-full max-w-sm lg:order-2 lg:max-w-none lg:min-w-72"
                />
              </div>

              <TrustBadges align="center" desktopHeartLabel="Feito com carinho para famílias" />
            </div>

            {/* Desktop: cena da família + balão ancorado no mascote (mockup) */}
            <div className="relative hidden items-center justify-center p-6 lg:flex xl:p-10">
              <div className="relative w-full max-w-[540px]">
                <AuthScene
                  src={cenaFamilia}
                  alt="Pai, mãe, criança e o mascote Sabidinho em um abraço acolhedor"
                  className="w-full"
                />
                <MascotSpeechBubble className="absolute right-[2%] bottom-[5%] max-w-[46%]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
