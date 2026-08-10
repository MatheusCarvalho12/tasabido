'use client'

import { Select } from '@base-ui/react/select'
import { CaretDown, Check } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export interface PillSelectOption {
  value: string
  label: string
}

interface PillSelectProps {
  id: string
  name: string
  /** Rótulo acessível (sr-only; o mockup usa placeholder). */
  label: string
  /** Ícone Phosphor colorido exibido à esquerda da pill. */
  icon: ReactNode
  /** Texto exibido enquanto nada foi escolhido. */
  placeholder: string
  options: PillSelectOption[]
  /** Valor selecionado; `null` quando nada foi escolhido. */
  value: string | null
  onValueChange: (value: string) => void
  onBlur?: () => void
  hasError?: boolean
  error?: string
  className?: string
}

/**
 * Dropdown pill "Tá Sabido" (mockup aprovado): trigger em pill branca com
 * ícone à esquerda e caret, popup de lista em popover (Base UI Select).
 * Usado no passo 3 (Conselho e UF do registro profissional).
 */
export function PillSelect({
  id,
  name,
  label,
  icon,
  placeholder,
  options,
  value,
  onValueChange,
  onBlur,
  hasError,
  error,
  className,
}: PillSelectProps) {
  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id} className="sr-only">
        {label}
      </FieldLabel>
      <FieldContent>
        <Select.Root
          name={name}
          items={options}
          value={value ?? undefined}
          onValueChange={(next) => {
            if (next) {
              onValueChange(next)
            }
            onBlur?.()
          }}
        >
          <Select.Trigger
            id={id}
            aria-invalid={hasError}
            aria-describedby={hasError && error ? `${id}-error` : undefined}
            className={cn(
              'relative flex h-14 w-full items-center gap-3 rounded-full border border-transparent bg-white pl-14 pr-5 text-base font-medium text-navy shadow-clay-sm outline-none select-none transition-[border-color,box-shadow] hover:border-turquoise/50 focus-visible:border-turquoise focus-visible:ring-3 focus-visible:ring-turquoise/30 data-popup-open:border-turquoise data-popup-open:ring-3 data-popup-open:ring-turquoise/30',
              className,
            )}
          >
            <span aria-hidden="true" className="absolute left-5">
              {icon}
            </span>
            <Select.Value className="flex-1 truncate text-left data-placeholder:font-medium data-placeholder:text-muted-foreground">
              {(selected) => {
                const opcao = options.find((option) => option.value === selected)
                return opcao?.label ?? placeholder
              }}
            </Select.Value>
            <CaretDown weight="bold" aria-hidden="true" className="size-5 shrink-0 text-navy/40" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={6} align="start" className="z-50">
              <Select.Popup className="max-h-72 min-w-[var(--anchor-width)] overflow-hidden rounded-2xl bg-white p-1.5 shadow-clay outline-none">
                <Select.List className="overflow-y-auto py-1">
                  {options.map((option) => (
                    <Select.Item
                      key={option.value}
                      value={option.value}
                      className="flex cursor-default items-center gap-2 rounded-xl px-3 py-2.5 text-base font-semibold text-navy outline-none select-none data-highlighted:bg-blue/10 data-selected:bg-blue/10"
                    >
                      <Select.ItemText className="flex-1">{option.label}</Select.ItemText>
                      <Select.ItemIndicator className="text-blue">
                        <Check weight="bold" className="size-4" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        {error && (
          <FieldError id={`${id}-error`} className="pl-5">
            {error}
          </FieldError>
        )}
      </FieldContent>
    </Field>
  )
}
