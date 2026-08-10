import { cn } from '@/lib/utils'

interface AuthSceneProps {
  src: string
  alt: string
  className?: string
}

/** Ilustração da tela de autenticação (família ou profissionais), com estilo clay. */
export function AuthScene({ src, alt, className }: AuthSceneProps) {
  return <img src={src} alt={alt} draggable={false} className={cn('h-auto', className)} />
}
