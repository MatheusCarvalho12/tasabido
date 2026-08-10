import { UserPlus } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'

export function SignupStubPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream px-4 text-center text-navy">
      <UserPlus
        weight="fill"
        aria-hidden="true"
        className="size-14 text-turquoise drop-shadow-[0_10px_16px_rgb(4_164_171/0.4)]"
      />
      <h1 className="text-2xl font-bold sm:text-3xl">Criar conta</h1>
      <p className="max-w-sm text-muted-foreground">
        A tela de cadastro está a caminho. Em breve você cria sua conta por aqui.
      </p>
      <Link
        to="/login"
        className="mt-2 text-sm font-bold text-blue underline decoration-blue/40 underline-offset-4 transition-colors hover:decoration-blue"
      >
        Voltar para o login
      </Link>
    </div>
  )
}
