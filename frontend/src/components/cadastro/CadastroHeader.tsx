import logo from '@/assets/logo.png'

interface CadastroHeaderProps {
  title: string
  subtitle?: string
}

/** Cabeçalho do cadastro: logo + título + subtítulo, sempre centralizados (mockup). */
export function CadastroHeader({ title, subtitle }: CadastroHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <img src={logo} alt="Tá Sabido" draggable={false} className="h-20 w-auto sm:h-24" />
      <h1 className="text-2xl font-bold leading-tight text-navy sm:text-3xl">{title}</h1>
      {subtitle && (
        <p className="max-w-md text-base font-semibold leading-snug text-navy/70 sm:text-lg">
          {subtitle}
        </p>
      )}
    </header>
  )
}
