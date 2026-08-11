import { FileCode, Image, X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'

import { type UploadRule, validateUploadFile } from '@/lib/games'
import { cn } from '@/lib/utils'

export type UploadKind = 'svg' | 'thumb' | 'banner'

const KIND_ICON: Record<UploadKind, typeof FileCode> = {
  svg: FileCode,
  thumb: Image,
  banner: Image,
}

const KIND_LABEL: Record<UploadKind, string> = {
  svg: 'Traçado do jogo (SVG)',
  thumb: 'Thumbnail do jogo',
  banner: 'Banner do jogo',
}

export interface FileUploadFieldProps {
  /** Tipo do upload — define rótulo, ícone e regra de validação. */
  kind: UploadKind
  /** Texto de apoio (ex.: "SVG com o traçado — até 500 KB"). */
  description: string
  rule: UploadRule
  /** Arquivo escolhido (preview imediato via object URL). */
  file: File | null
  /** Arquivo que o jogo já tem no servidor (preview quando não há arquivo novo). */
  existingUrl?: string | null
  /** null desmarca (o jogo fica sem arquivo novo; o antigo permanece). */
  onChange: (file: File | null) => void
}

/**
 * Upload de arquivo do form de gestão (SVG/thumbnail/banner): área clicável
 * com preview imediato do arquivo escolhido (object URL) e validação local
 * espelhando o backend (extensão + tamanho). O arquivo antigo do servidor
 * continua como preview até o profissional escolher um novo.
 */
export function FileUploadField({
  kind,
  description,
  rule,
  file,
  existingUrl,
  onChange,
}: FileUploadFieldProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const Icon = KIND_ICON[kind]

  // Preview do arquivo escolhido; revoga a object URL ao trocar/desmontar.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handlePick = (next: File | null) => {
    setError(null)
    if (!next) {
      onChange(null)
      return
    }
    const validationError = validateUploadFile(next, rule)
    if (validationError) {
      setError(validationError)
      onChange(null)
      return
    }
    onChange(next)
  }

  const showPreview = previewUrl ?? existingUrl

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-navy">{KIND_LABEL[kind]}</span>
      <div
        className={cn(
          'relative flex min-h-36 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-turquoise/40 bg-white/70 px-4 py-4 text-center transition-colors',
          'hover:border-turquoise hover:bg-white focus-within:border-turquoise focus-within:ring-3 focus-within:ring-turquoise/25',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={rule.accept}
          aria-label={`Escolher ${KIND_LABEL[kind].toLowerCase()}`}
          className="sr-only"
          onChange={(event) => {
            handlePick(event.target.files?.[0] ?? null)
            // Permite escolher o mesmo arquivo de novo após um erro.
            event.target.value = ''
          }}
        />
        {showPreview ? (
          <>
            <img
              src={showPreview}
              alt="Prévia do arquivo escolhido"
              className="max-h-32 w-auto max-w-full rounded-xl object-contain shadow-clay-sm"
            />
            <span className="max-w-full truncate text-xs font-semibold text-muted-foreground">
              {file?.name ?? (kind === 'svg' ? 'SVG atual' : 'Imagem atual')}
            </span>
            <button
              type="button"
              onClick={() => {
                handlePick(null)
                if (inputRef.current) {
                  inputRef.current.value = ''
                }
              }}
              aria-label={`Remover ${KIND_LABEL[kind].toLowerCase()}`}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-navy/10 text-navy transition-colors hover:bg-coral hover:text-white"
            >
              <X weight="bold" aria-hidden="true" className="size-4" />
            </button>
          </>
        ) : (
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 text-navy"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-turquoise/15 text-turquoise">
              <Icon weight="bold" aria-hidden="true" className="size-6" />
            </span>
            <span className="text-sm font-bold">Clique para escolher</span>
            <span className="text-xs font-medium text-muted-foreground">{description}</span>
          </label>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-coral">{error}</p>}
      {!error && file && (
        <p className="text-xs font-semibold text-turquoise-dark">
          Arquivo pronto para enviar ao salvar
        </p>
      )}
    </div>
  )
}
