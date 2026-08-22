/**
 * Área dos pais (rota /pais) - Tickets A4 & A5.
 * Protegida por PIN. Inclui visualização e revisão detalhada de partidas de traçado da criança via APIs autorizadas.
 */

import {
  CalendarBlank,
  CheckCircle,
  GameController,
  LockKey,
  PencilSimple,
  WarningCircle,
} from '@phosphor-icons/react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import logo from '@/assets/logo.png'
import { TracingRunReviewView } from '@/components/tracing/TracingRunReviewView'
import { Button } from '@/components/ui/button'
import { lockLandscape, unlockOrientation } from '@/lib/orientation'
import { fetchTracingRunReplayApi, fetchTracingRunsListApi } from '@/lib/tracing/adapter'
import type { BackendTracingRunOut } from '@/lib/tracing/types'
import { useParentPinStore } from '@/stores/useParentPinStore'

export function ParentsAreaPage() {
  const navigate = useNavigate()
  const lock = useParentPinStore((s) => s.lock)
  const [selectedSession, setSelectedSession] = useState<BackendTracingRunOut | null>(null)
  const [sessions, setSessions] = useState<BackendTracingRunOut[]>([])

  useEffect(() => {
    void fetchTracingRunsListApi()
      .then((data) => {
        setSessions(data)
      })
      .catch(() => {
        setSessions([])
      })
  }, [])

  const handleOpenReplay = async (sess: BackendTracingRunOut) => {
    try {
      const full = await fetchTracingRunReplayApi(sess.id)
      setSelectedSession(full)
    } catch {
      setSelectedSession(sess)
    }
  }

  const handleBackToGames = () => {
    lock()
    unlockOrientation()
    void lockLandscape()
    void navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-dvh flex-col bg-cream px-4 py-6 sm:px-8 text-navy font-sans">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between gap-4 pb-6 border-b border-kid-bg">
        <img src={logo} alt="Tá Sabido" draggable={false} className="h-10 w-auto sm:h-12" />
        <Button
          onClick={handleBackToGames}
          className="h-11 rounded-full bg-blue text-white px-5 text-sm font-bold shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0"
        >
          <GameController className="size-5" aria-hidden="true" />
          Voltar aos jogos
        </Button>
      </header>

      {/* Conteúdo: Seção de Revisão de Partida ou Lista de Partidas */}
      <div className="flex-1 py-6 max-w-5xl mx-auto w-full">
        {selectedSession ? (
          <TracingRunReviewView session={selectedSession} onBack={() => setSelectedSession(null)} />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-turquoise to-turquoise-dark text-white shadow-clay-sm">
                <LockKey weight="fill" aria-hidden="true" className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Área dos pais</h1>
                <p className="text-sm text-kid-muted font-medium">
                  Acompanhe as atividades e o desenvolvimento motor das crianças da família
                </p>
              </div>
            </div>

            {/* Lista de Partidas Gravadas */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-navy flex items-center gap-2">
                  <PencilSimple weight="bold" className="size-5 text-blue" />
                  Atividades de Traçado do Nome ({sessions.length})
                </h2>
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white border-2 border-kid-bg text-center flex flex-col items-center gap-2">
                  <p className="text-base font-bold text-navy">Nenhuma partida registrada ainda</p>
                  <p className="text-xs text-kid-muted font-medium">
                    Quando a criança jogar "Escreva seu nome", os resultados e o replay aparecerão
                    aqui.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((sess) => {
                    const formattedDate = sess.started_at
                      ? new Date(sess.started_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Data indisponível'

                    return (
                      <div
                        key={sess.id}
                        className="p-5 rounded-3xl bg-white border border-kid-bg shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-kid-muted flex items-center gap-1">
                              <CalendarBlank weight="bold" className="size-3.5" />
                              {formattedDate}
                            </span>
                            {sess.status === 'completed' ? (
                              <span className="text-[11px] font-black text-turquoise-dark bg-turquoise/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle weight="fill" className="size-3" />
                                Concluído
                              </span>
                            ) : (
                              <span className="text-[11px] font-black text-coral-dark bg-coral/15 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <WarningCircle weight="fill" className="size-3" />
                                Parcial
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-extrabold text-navy">Partida #{sess.id}</h3>

                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-blue">
                              {sess.score ?? 0}%
                            </span>
                            <span className="text-xs text-kid-muted font-medium">
                              desempenho ({sess.glyph_sequence?.length ?? 0} letras)
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenReplay(sess)}
                          className="h-10 w-full rounded-full bg-kid-bg text-navy text-xs font-extrabold hover:bg-blue hover:text-white transition-colors"
                        >
                          Ver avaliação e replay
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
