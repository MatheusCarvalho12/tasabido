import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '@/assets/logo.png'
import mascote from '@/assets/mascote.png'
import { PinKeypad } from '@/components/jogos/PinKeypad'
import { ApiRequestError } from '@/lib/api'
import { lockPortrait, unlockOrientation } from '@/lib/orientation'
import { validateParentPinApi } from '@/lib/parent-pin'
import { useParentPinStore } from '@/stores/useParentPinStore'

export const PIN_LENGTH = 6

/** Erros amigáveis, na voz do produto (pt-BR). */
export const PIN_ERROR_WRONG = 'PIN incorreto, tente de novo.'
export const PIN_ERROR_OFFLINE =
  'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo em instantes.'

/** Cadeado grande com anel segmentado (creme/turquesa/azul), referência canônica. */
function BigLockGraphic() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="size-44 drop-shadow-[0_18px_24px_rgb(4_164_171/0.35)] sm:size-52"
    >
      {/* Anel segmentado com aberturas (abertura principal no topo) */}
      <g fill="none" strokeLinecap="round">
        <path d="M 31 158 A 90 90 0 0 1 42 31" stroke="#EDE8DC" strokeWidth="17" />
        <path d="M 69 15 A 90 90 0 0 1 123 13" stroke="#0d79f0" strokeWidth="17" />
        <path d="M 145 22 A 90 90 0 0 1 84 189" stroke="#04a4ab" strokeWidth="17" />
      </g>
      {/* Cadeado */}
      <g>
        <path
          d="M 78 96 V 72 a 22 22 0 0 1 44 0 V 96"
          fill="none"
          stroke="#079a9f"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <rect x="66" y="90" width="68" height="72" rx="22" fill="url(#lock-body)" />
        <rect
          x="66"
          y="90"
          width="68"
          height="72"
          rx="22"
          fill="none"
          stroke="#079a9f"
          strokeWidth="2"
        />
        {/* Keyhole */}
        <circle cx="100" cy="116" r="8.5" fill="#00515d" />
        <rect x="94.5" y="120" width="11" height="19" rx="5.5" fill="#00515d" />
        <ellipse cx="100" cy="162" rx="26" ry="9" fill="#04898e" opacity="0.5" />
      </g>
      <defs>
        <linearGradient id="lock-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#19c9c7" />
          <stop offset="1" stopColor="#04a4ab" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** Linha de 6 indicadores: preenchidos conforme o PIN digitado. */
const DOT_IDS = ['pin-1', 'pin-2', 'pin-3', 'pin-4', 'pin-5', 'pin-6'] as const

function PinDots({ count, errorKey }: { count: number; errorKey: number }) {
  return (
    <motion.div
      key={errorKey}
      animate={errorKey > 0 ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : undefined}
      transition={{ duration: 0.45 }}
      className="flex items-center gap-3 sm:gap-4"
      role="img"
      aria-label={`${count} de ${PIN_LENGTH} dígitos digitados`}
    >
      {DOT_IDS.map((dotId, i) => (
        <span
          key={dotId}
          aria-hidden="true"
          className={
            i < count
              ? 'size-3.5 rounded-full bg-gradient-to-b from-turquoise-light to-turquoise shadow-[0_4px_8px_rgb(4_164_171/0.45)] sm:size-4'
              : 'size-3.5 rounded-full border-[3px] border-turquoise bg-transparent sm:size-4'
          }
        />
      ))}
    </motion.div>
  )
}

/** Celebração rápida do Sabidinho antes de entrar na área dos pais. */
function SuccessCelebration() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-cream/90"
      role="status"
    >
      <motion.img
        src={mascote}
        alt="Sabidinho comemorando"
        draggable={false}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
        className="size-28 object-contain sm:size-32"
      />
      <p className="text-xl font-extrabold text-navy sm:text-2xl">Tudo certo!</p>
    </motion.div>
  )
}

/**
 * Tela de PIN dos pais (rota /pin). Força orientação VERTICAL no celular;
 * no desktop vira modal central. PIN validado na API — zero mock.
 */
export function PinScreen() {
  const navigate = useNavigate()
  const unlock = useParentPinStore((s) => s.unlock)
  const [digits, setDigits] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const submittingRef = useRef(false)
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void lockPortrait()
    return () => {
      unlockOrientation()
      // Nunca navegar depois de desmontar (ex.: teste/rota trocada no meio).
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current)
        navigateTimerRef.current = null
      }
    }
  }, [])

  const submitPin = useCallback(
    async (pin: string) => {
      if (submittingRef.current) {
        return
      }
      submittingRef.current = true
      setLoading(true)
      try {
        const { valido } = await validateParentPinApi(pin)
        if (valido) {
          unlock()
          setCelebrating(true)
          navigateTimerRef.current = setTimeout(() => {
            navigateTimerRef.current = null
            void navigate({ to: '/pais' })
          }, 900)
        } else {
          setErrorMsg(PIN_ERROR_WRONG)
          setErrorKey((k) => k + 1)
          setDigits('')
        }
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          setErrorMsg(PIN_ERROR_WRONG)
        } else {
          setErrorMsg(PIN_ERROR_OFFLINE)
        }
        setErrorKey((k) => k + 1)
        setDigits('')
      } finally {
        submittingRef.current = false
        setLoading(false)
      }
    },
    [navigate, unlock],
  )

  const handleDigit = (digit: string) => {
    if (loading || celebrating) {
      return
    }
    const next = digits.length < PIN_LENGTH ? digits + digit : digits
    setDigits(next)
    setErrorMsg(null)
    if (next.length === PIN_LENGTH) {
      void submitPin(next)
    }
  }

  const handleBackspace = () => {
    if (loading || celebrating) {
      return
    }
    setDigits((d) => d.slice(0, -1))
    setErrorMsg(null)
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-cream px-6 pt-8 pb-10 text-navy sm:px-10">
      {/* Logo no topo (esquerda, como na referência) */}
      <img
        src={logo}
        alt="Tá Sabido"
        draggable={false}
        className="h-14 w-auto self-start drop-shadow-sm sm:h-16"
      />

      {/* Sabidinho curioso no canto direito */}
      <img
        src={mascote}
        alt="Sabidinho espiando a digitação do PIN"
        draggable={false}
        className="pointer-events-none absolute top-2 right-2 w-20 object-contain drop-shadow-md sm:w-28 lg:right-10"
      />

      <div className="flex w-full max-w-sm flex-col items-center gap-5 pt-2 sm:gap-6">
        <BigLockGraphic />

        <div className="text-center">
          <h1 className="text-[1.75rem] leading-tight font-extrabold text-navy sm:text-4xl">
            Digite o PIN dos pais
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground sm:text-base">
            Para acessar as configurações da família
          </p>
        </div>

        <PinDots count={digits.length} errorKey={errorKey} />

        <div aria-live="polite">
          {errorMsg && (
            <p role="alert" className="text-sm font-bold text-coral-dark sm:text-base">
              {errorMsg}
            </p>
          )}
        </div>

        <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} disabled={loading} />

        {loading && (
          <p className="text-sm font-semibold text-muted-foreground" role="status">
            Conferindo o PIN…
          </p>
        )}
      </div>

      {/* Blobs decorativos nos cantos inferiores (estilo clay da referência) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="clay-blob absolute -bottom-16 -left-14 size-52 rounded-[42%_58%_60%_40%/55%_45%_60%_40%] bg-gradient-to-br from-turquoise-light via-turquoise to-turquoise-dark opacity-85 sm:size-64" />
        <div className="clay-blob absolute -right-14 -bottom-14 size-44 -rotate-6 rounded-[55%_45%_40%_60%/45%_55%_50%_50%] bg-gradient-to-br from-[#f8784f] via-coral to-coral-dark opacity-85 sm:size-56" />
      </div>

      <AnimatePresence>{celebrating && <SuccessCelebration />}</AnimatePresence>
    </main>
  )
}
