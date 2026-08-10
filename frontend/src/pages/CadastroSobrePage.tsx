import { ClayBlobs } from '@/components/auth/ClayBlobs'
import { CadastroHeader } from '@/components/cadastro/CadastroHeader'
import { CadastroProgress } from '@/components/cadastro/CadastroProgress'

/** Passo 2 do cadastro familiar — "Sobre você". Rota stub: próxima tela. */
export function CadastroSobrePage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream text-navy">
      <ClayBlobs />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl animate-card-in rounded-[2rem] bg-panel p-8 shadow-clay sm:rounded-[2.5rem] sm:p-12">
          <div className="flex flex-col items-center gap-7">
            <CadastroHeader
              title="Sobre você"
              subtitle="Agora queremos te conhecer um pouquinho melhor."
            />
            <CadastroProgress currentStep={2} />
            <p className="text-center font-semibold text-muted-foreground">
              Esta etapa está a caminho. Em instantes você conta um pouco mais sobre você.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
