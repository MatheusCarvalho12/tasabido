import { Eye, EyeSlash, Lock } from '@phosphor-icons/react'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordFieldProps {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
  errorId?: string
  className?: string
  /** Placeholder exibido na pill (padrão: "Senha"). */
  placeholder?: string
  /** Autocomplete do campo (padrão: senha atual; cadastro usa "new-password"). */
  autoComplete?: string
}

/**
 * Campo de senha no estilo do mockup: cadeado roxo à esquerda,
 * botão de olho à direita para alternar a visibilidade.
 */
export function PasswordField({
  id,
  name,
  value,
  onChange,
  onBlur,
  hasError,
  errorId,
  className,
  placeholder = 'Senha',
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative', className)}>
      <Lock
        weight="fill"
        aria-hidden="true"
        className="absolute left-5 top-1/2 size-6 -translate-y-1/2 text-purple"
      />
      <Input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className="h-14 rounded-full border-transparent bg-white pl-14 pr-16 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {visible ? (
          <EyeSlash className="size-6" aria-hidden="true" />
        ) : (
          <Eye className="size-6" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
