import { useNavigate } from '@tanstack/react-router'

import cenaFamilia from '@/assets/cena-familia.png'
import { AuthScene } from '@/components/auth/AuthScene'
import { BrandHeader } from '@/components/auth/BrandHeader'
import { ClayBlobs } from '@/components/auth/ClayBlobs'
import { LoginForm } from '@/components/auth/LoginForm'
import { TrustBadges } from '@/components/auth/TrustBadges'
import { saveAuth } from '@/lib/auth'
import type { User } from '@/types/auth'

export function LoginPage() {
  const navigate = useNavigate()

  const handleLoggedIn = (token: string, user: User, remember: boolean) => {
    saveAuth(token, user, remember)
    void navigate({ to: '/' })
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream text-navy">
      <ClayBlobs />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full animate-card-in rounded-[2rem] bg-panel shadow-clay sm:rounded-[2.5rem]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col items-center gap-7 px-6 py-9 sm:px-12 sm:py-12 lg:items-start lg:gap-8 lg:px-14 lg:py-14">
              <BrandHeader />

              {/* Mobile: a cena fica entre a tagline e o formulário (mockup) */}
              <div className="lg:hidden">
                <AuthScene
                  src={cenaFamilia}
                  alt="Médica, criança, pai e o mascote Sabidinho em um abraço acolhedor"
                  className="mx-auto w-full max-w-72 sm:max-w-80"
                />
              </div>

              <LoginForm onLoggedIn={handleLoggedIn} />
              <TrustBadges />
            </div>

            {/* Desktop: cena à direita (mockup) */}
            <div className="hidden items-center justify-center p-6 lg:flex xl:p-10">
              <AuthScene
                src={cenaFamilia}
                alt="Médica, criança, pai e o mascote Sabidinho em um abraço acolhedor"
                className="w-full max-w-[540px]"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
