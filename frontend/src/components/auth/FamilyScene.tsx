import cenaFamilia from '@/assets/cena-familia.png'
import { cn } from '@/lib/utils'

interface FamilySceneProps {
  className?: string
}

export function FamilyScene({ className }: FamilySceneProps) {
  return (
    <img
      src={cenaFamilia}
      alt="Médica, criança, pai e o mascote Sabidinho em um abraço acolhedor"
      draggable={false}
      className={cn('h-auto', className)}
    />
  )
}
