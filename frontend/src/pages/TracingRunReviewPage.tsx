/**
 * Página de visualização de detalhes de partidas de traçado para adultos (Ticket A4).
 * Rotas: /profissional/partidas/$runId e /pais/partidas/$runId.
 */

import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'

import logo from '@/assets/logo.png'
import { TracingRunReviewView } from '@/components/tracing/TracingRunReviewView'
import { fetchTracingRunDetailApi } from '@/lib/tracing/adapter'

export function TracingRunReviewPage() {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const runId = (params as { runId?: string }).runId ?? ''

  const runQuery = useQuery({
    queryKey: ['tracing-run', runId],
    queryFn: () => fetchTracingRunDetailApi(runId),
    enabled: Boolean(runId),
    retry: false,
  })

  const session = runQuery.data ?? null

  const handleBack = () => {
    // Retorna para a área correspondente
    if (window.location.pathname.startsWith('/profissional')) {
      void navigate({ to: '/profissional' })
    } else {
      void navigate({ to: '/pais' })
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-cream text-navy font-sans">
      <header className="flex items-center justify-between px-6 py-4 border-b border-kid-bg bg-white/80 backdrop-blur-sm">
        <img src={logo} alt="Tá Sabido" className="h-9 w-auto select-none" />
        <span className="text-xs font-bold text-kid-muted uppercase tracking-wider">
          Auditoria e Revisão de Desempenho
        </span>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {runQuery.isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
            <div className="size-10 border-4 border-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-kid-muted">Carregando telemetria da partida...</p>
          </div>
        ) : (
          <TracingRunReviewView session={session} onBack={handleBack} />
        )}
      </main>
    </div>
  )
}
