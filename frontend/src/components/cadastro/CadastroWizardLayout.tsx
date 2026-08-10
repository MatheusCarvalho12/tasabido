import { ArrowLeft } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import cenaFamilia from '@/assets/cena-familia.png'
import { AuthScene } from '@/components/auth/AuthScene'
import { ClayBlobs } from '@/components/auth/ClayBlobs'
import { TrustBadges } from '@/components/auth/TrustBadges'
import { CadastroHeader } from '@/components/cadastro/CadastroHeader'
import { CadastroProgress } from '@/components/cadastro/CadastroProgress'
import { ContinueButton } from '@/components/cadastro/ContinueButton'
import { MascotSpeechBubble, MascotSpeechRow } from '@/components/cadastro/MascotSpeechBubble'

interface CadastroWizardLayoutProps {
  /** Passo ativo (1-4), exibido no progresso. */
  currentStep: number
  title: string
  subtitle?: string
  /** Rota do passo anterior (link "Voltar"). Omitido no passo 1. */
  backTo?: string
  /** Texto do balão do Sabidinho (mobile + desktop). */
  bubbleText: string
  children: ReactNode
  continueLabel?: string
  continueDisabled?: boolean
  onContinue?: () => void
  /** Rótulos dos 4 passos (profissional usa os seus próprios). */
  steps?: string[]
  /** Cena exibida à direita (família por padrão; profissional passa a sua). */
  sceneSrc?: string
  sceneAlt?: string
  /** Rótulo longo do selo "Feito com carinho" (famílias / profissionais). */
  trustLabel?: string
  /** Rota do link "Já tenho conta" (login familiar / profissional). */
  loginTo?: string
}

/**
 * Estrutura comum das telas de cadastro (mockup aprovado):
 * blobs decorativos, painel clay, coluna esquerda com fluxo e coluna
 * direita com a cena + balão do mascote no desktop. Parâmetros extras
 * (steps, cena, selos, login) permitem o fluxo profissional sem duplicar.
 */
export function CadastroWizardLayout({
  currentStep,
  title,
  subtitle,
  backTo,
  bubbleText,
  children,
  continueLabel,
  continueDisabled,
  onContinue,
  steps,
  sceneSrc = cenaFamilia,
  sceneAlt = 'Pai, mãe, criança e o mascote Sabidinho em um abraço acolhedor',
  trustLabel = 'Feito com carinho para famílias',
  loginTo = '/login',
}: CadastroWizardLayoutProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream text-navy">
      <ClayBlobs />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* my-auto: centraliza quando o painel cabe; top-alinha + scroll quando é alto */}
        <div className="my-auto w-full animate-card-in rounded-[2rem] bg-panel shadow-clay sm:rounded-[2.5rem]">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
            {/* Coluna esquerda: fluxo de cadastro (mobile e desktop) */}
            <div className="flex flex-col items-center gap-6 px-6 py-9 sm:gap-7 sm:px-12 sm:py-12 lg:gap-8 lg:px-14 lg:py-14">
              {backTo && (
                <Link
                  to={backTo}
                  className="-mb-2 flex items-center gap-1 self-start text-base font-bold text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue"
                >
                  <ArrowLeft weight="bold" aria-hidden="true" className="size-5" />
                  Voltar
                </Link>
              )}

              <CadastroHeader title={title} subtitle={subtitle} />

              <CadastroProgress currentStep={currentStep} steps={steps} />

              {/* Mobile: a cena fica entre o progresso e o conteúdo (mockup) */}
              <div className="lg:hidden">
                <AuthScene
                  src={sceneSrc}
                  alt={sceneAlt}
                  className="mx-auto w-full max-w-72 sm:max-w-80"
                />
              </div>

              {children}

              {/* Mobile: mascote + balão ancorado (mockup) */}
              <div className="lg:hidden">
                <MascotSpeechRow text={bubbleText} />
              </div>

              <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Link
                  to={loginTo}
                  className="order-2 text-base font-bold whitespace-nowrap text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue lg:order-1 lg:text-lg"
                >
                  Já tenho conta
                </Link>
                <ContinueButton
                  disabled={continueDisabled}
                  onClick={onContinue}
                  label={continueLabel}
                  className="order-1 w-full max-w-sm lg:order-2 lg:max-w-none lg:min-w-72"
                />
              </div>

              <TrustBadges align="center" desktopHeartLabel={trustLabel} />
            </div>

            {/* Desktop: cena + balão ancorado no mascote (mockup) */}
            <div className="relative hidden items-center justify-center p-6 lg:flex xl:p-10">
              <div className="relative w-full max-w-[540px]">
                <AuthScene src={sceneSrc} alt={sceneAlt} className="w-full" />
                <MascotSpeechBubble
                  text={bubbleText}
                  tail="bottom"
                  className="absolute right-[2%] bottom-[30%] max-w-[46%]"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
