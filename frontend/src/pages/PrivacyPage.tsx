import { ShieldCheck } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

export function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-4 text-center text-navy">
      <ShieldCheck
        weight="fill"
        aria-hidden="true"
        className="size-14 text-turquoise drop-shadow-[0_10px_16px_rgb(45_212_191/0.4)]"
      />
      <h1 className="text-2xl font-bold sm:text-3xl">Política de Privacidade</h1>
      <p className="max-w-sm text-muted-foreground">
        A Política de Privacidade está a caminho. Em breve você confere tudo por aqui, sem letras
        miúdas.
      </p>
      <Link
        to="/cadastro/finalizar"
        className="mt-2 text-sm font-bold text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue"
      >
        Voltar para o cadastro
      </Link>
    </div>
  )
}
