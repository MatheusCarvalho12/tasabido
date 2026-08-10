import { SignOut, UserCircle } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiRequestError, fetchMeApi } from '@/lib/api'
import { clearAuth, getStoredUser, getToken } from '@/lib/auth'

/**
 * Home provisória: mostra "Olá, {name}" e permite sair.
 * A home real por papel vem na próxima tela.
 */
export function HomePage() {
  const navigate = useNavigate()

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMeApi,
    enabled: Boolean(getToken()),
    retry: false,
  })

  useEffect(() => {
    if (meQuery.error instanceof ApiRequestError && meQuery.error.status === 401) {
      clearAuth()
      void navigate({ to: '/login' })
    }
  }, [meQuery.error, navigate])

  const handleLogout = () => {
    clearAuth()
    void navigate({ to: '/login' })
  }

  const user = meQuery.data ?? getStoredUser()

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-cream px-4 text-center text-navy">
      {meQuery.isPending ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-40" />
        </div>
      ) : (
        <>
          <UserCircle
            weight="fill"
            aria-hidden="true"
            className="size-20 text-turquoise drop-shadow-[0_10px_16px_rgb(4_164_171/0.4)]"
          />
          {user ? (
            <>
              <h1 className="text-2xl font-bold sm:text-3xl">Olá, {user.name}!</h1>
              <p className="text-muted-foreground">Que bom te ver por aqui.</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Não conseguimos carregar seus dados.
              </h1>
              <p className="text-muted-foreground">Tente entrar de novo em instantes.</p>
            </>
          )}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="mt-2 h-12 rounded-full border-transparent bg-white px-7 text-base font-bold text-turquoise-dark shadow-clay-white transition-[transform,box-shadow] hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
          >
            <SignOut className="size-5" aria-hidden="true" />
            Sair
          </Button>
        </>
      )}
    </div>
  )
}
