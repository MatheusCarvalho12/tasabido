import { type MaskOptions, useMask } from '@react-input/mask'
import type { ReactNode } from 'react'

import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CadastroTextFieldProps {
  id: string
  name: string
  /** Rótulo acessível (sr-only, o mockup usa placeholder). */
  label: string
  /** Ícone Phosphor colorido exibido à esquerda da pill. */
  icon: ReactNode
  placeholder: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
  error?: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email'
  autoComplete?: string
  /** Máscara de entrada (@react-input/mask) aplicada no input, ex.: telefone. */
  mask?: MaskOptions
  className?: string
}

/**
 * Campo de texto do cadastro no estilo do mockup: pill branca com sombra,
 * ícone colorido à esquerda e placeholder como orientação.
 */
export function CadastroTextField({
  id,
  name,
  label,
  icon,
  placeholder,
  value,
  onChange,
  onBlur,
  hasError,
  error,
  type,
  inputMode,
  autoComplete,
  mask,
  className,
}: CadastroTextFieldProps) {
  const inputRef = useMask(mask)
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <FieldContent>
        <div className="relative">
          <span aria-hidden="true" className="absolute left-5 top-1/2 -translate-y-1/2">
            {icon}
          </span>
          {/* Sem máscara, o ref fica vazio: o useMask(undefined) também
              interceptaria o input e limparia o valor digitado. */}
          <Input
            ref={mask ? inputRef : undefined}
            id={id}
            name={name}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            aria-invalid={hasError}
            aria-describedby={hasError && error ? `${id}-error` : undefined}
            className={cn(
              'h-14 w-full rounded-full border-transparent bg-white pl-14 pr-5 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base',
              className,
            )}
          />
        </div>
        {error && (
          <FieldError id={`${id}-error`} className="pl-5">
            {error}
          </FieldError>
        )}
      </FieldContent>
    </Field>
  )
}
