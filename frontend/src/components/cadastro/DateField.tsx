import { CalendarBlank } from '@phosphor-icons/react'
import { useRef } from 'react'

import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatBrDate, maskBrDate, toIsoDate } from '@/lib/cadastro'

interface DateFieldProps {
  id: string
  name: string
  label: string
  /** Valor no formato dd/mm/aaaa. */
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  hasError: boolean
  error?: string
}

/**
 * Campo de data "bonito": pill com máscara dd/mm/aaaa enquanto digita,
 * ícone de calendário que abre o picker nativo do navegador (showPicker).
 */
export function DateField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  hasError,
  error,
}: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null)

  const openPicker = () => {
    const picker = pickerRef.current
    if (!picker) {
      return
    }
    if (typeof picker.showPicker === 'function') {
      picker.showPicker()
    } else {
      picker.click()
    }
  }

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <FieldContent>
        <div className="relative">
          <button
            type="button"
            onClick={openPicker}
            aria-label={`Abrir calendário de ${label}`}
            className="absolute left-4 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-purple transition-colors hover:bg-muted hover:text-purple-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CalendarBlank weight="fill" aria-hidden="true" className="size-6" />
          </button>
          <Input
            id={id}
            name={name}
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="dd/mm/aaaa"
            value={value}
            onChange={(event) => onChange(maskBrDate(event.target.value))}
            onBlur={onBlur}
            aria-invalid={hasError}
            aria-describedby={hasError && error ? `${id}-error` : undefined}
            className="h-14 w-full rounded-full border-transparent bg-white pl-14 pr-5 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base"
          />
          {/* Picker nativo invisível: abre pela seta do calendário (showPicker). */}
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            value={value ? (toIsoDate(value) ?? '') : ''}
            onChange={(event) => {
              const parts = event.target.value.split('-').map(Number)
              if (parts.length === 3 && parts.every(Number.isFinite)) {
                onChange(formatBrDate(new Date(parts[0], parts[1] - 1, parts[2])))
              }
            }}
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
