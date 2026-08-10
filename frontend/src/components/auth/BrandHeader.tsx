import logo from '@/assets/logo.png'

export function BrandHeader() {
  return (
    <header className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
      <img src={logo} alt="Tá Sabido" draggable={false} className="h-20 w-auto sm:h-24 lg:h-28" />
      <p className="max-w-md text-lg font-semibold leading-snug text-navy sm:text-xl">
        Conectando médicos e famílias no cuidado de crianças neuroatípicas.
      </p>
    </header>
  )
}
