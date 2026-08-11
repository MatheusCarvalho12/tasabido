import { ArrowLeft } from '@phosphor-icons/react'
import { useNavigate, useParams } from '@tanstack/react-router'

import logo from '@/assets/logo.png'
import mascote from '@/assets/mascote.png'

/** "escreva-seu-nome" → "Escreva seu nome" (nome de exibição do placeholder). */
function slugParaNome(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
}

/**
 * Placeholder da tela do jogo (rota /jogar/{slug}) — o jogo em si é a
 * próxima frente do projeto; aqui só navegamos vindo do preview.
 */
export function JogoEmConstrucaoPage() {
  const navigate = useNavigate()
  const { slug } = useParams({ from: '/jogar/$slug' })
  const nome = slugParaNome(slug)

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <img src={logo} alt="Tá Sabido" className="h-9 md:h-11" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
        <img
          src={mascote}
          alt=""
          aria-hidden="true"
          className="w-32 drop-shadow-xl md:w-44"
          draggable={false}
        />
        <h1 className="text-3xl font-extrabold text-navy md:text-4xl">Jogo em construção</h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          “{nome}” está quase pronto — a brincadeira chega em breve.
        </p>
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className="group mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-blue px-6 text-base font-bold text-white shadow-clay-btn transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-blue-dark active:translate-y-0 md:h-14 md:text-lg"
        >
          <ArrowLeft
            weight="bold"
            className="size-5 transition-transform group-hover:-translate-x-0.5"
          />
          Voltar aos jogos
        </button>
      </main>
    </div>
  )
}
