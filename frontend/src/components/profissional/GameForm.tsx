import {
  Check,
  FileText,
  FloppyDiskBack,
  GlobeSimple,
  LockSimple,
  PaperPlaneTilt,
  PencilSimple,
} from '@phosphor-icons/react'
import { useState } from 'react'

import { FileUploadField } from '@/components/profissional/FileUploadField'
import { TracingBehaviorSection } from '@/components/profissional/TracingBehaviorSection'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  type GameFilesPayload,
  type GameFormValues,
  gameFormSchema,
  IMAGE_UPLOAD_RULE,
  SVG_UPLOAD_RULE,
} from '@/lib/games'
import { DEFAULT_TRACING_GAME_CONFIG, type TracingGameConfig } from '@/lib/tracing/types'
import { cn } from '@/lib/utils'
import type { Game } from '@/types/game'

/** Paleta de cores do form (tokens oficiais clay + thumb do modo criança). */
const PALETA_CORES = [
  '#04A4AB',
  '#0D79F0',
  '#F6552D',
  '#F29E21',
  '#9372D5',
  '#002767',
  '#48C3C7',
  '#79B9E5',
  '#F36A4D',
  '#FFCA2B',
]

/** Sugestões de categoria (datalist) — as do design system, sem inventar. */
const CATEGORIAS_SUGERIDAS = [
  'escrita',
  'coordenacao-motora',
  'percepcao-visual',
  'inteligencia-emocional',
]

export interface GameFormProps {
  /** Jogo em edição; null/undefined = criação. */
  game?: Game | null
  /** Configuração inicial de traçado se existente. */
  initialTracingConfig?: TracingGameConfig
  /** Requisição em andamento (desabilita os botões de ação). */
  submitting?: boolean
  /** Erro da API (mostrado acima das ações). */
  submitError?: string | null
  onSubmit: (
    values: GameFormValues,
    files: GameFilesPayload,
    publish: boolean,
    tracingConfig?: TracingGameConfig,
  ) => void
  onCancel: () => void
}

/**
 * Formulário criar/editar jogo (gestão do profissional): campos do contrato
 * (título, categoria, descrição, tutorial, visibilidade, cores, comportamento do traçado)
 * + uploads de SVG/thumbnail/banner com preview, validação zod e duas
 * ações: salvar rascunho (POST/PATCH) e publicar (POST /publish).
 */
export function GameForm({
  game,
  initialTracingConfig,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: GameFormProps) {
  const [titulo, setTitulo] = useState(game?.titulo ?? '')
  const [categoria, setCategoria] = useState(game?.categoria ?? '')
  const [descricao, setDescricao] = useState(game?.descricao ?? '')
  const [tutorial, setTutorial] = useState(game?.tutorial ?? '')
  const [visibilidade, setVisibilidade] = useState<'public' | 'private'>(
    game?.visibilidade ?? 'public',
  )
  const [cores, setCores] = useState<string[]>(game?.cores.slice(0, 3) ?? [])
  const [svgFile, setSvgFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [tracingConfig, setTracingConfig] = useState<TracingGameConfig>(
    initialTracingConfig ?? DEFAULT_TRACING_GAME_CONFIG,
  )
  const [errors, setErrors] = useState<Partial<Record<keyof GameFormValues, string>>>({})

  const parsed = gameFormSchema.safeParse({
    titulo,
    categoria,
    descricao,
    tutorial,
    visibilidade,
    cores,
  })

  const clearError = (field: keyof GameFormValues) =>
    setErrors((current) => ({ ...current, [field]: undefined }))

  const submit = (publish: boolean) => {
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof GameFormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof GameFormValues
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message
        }
      }
      setErrors(nextErrors)
      return
    }
    onSubmit(
      parsed.data,
      { svg: svgFile, thumb: thumbFile, banner: bannerFile },
      publish,
      tracingConfig,
    )
  }

  const toggleCor = (cor: string) => {
    setCores((current) => {
      if (current.includes(cor)) {
        return current.filter((item) => item !== cor)
      }
      if (current.length >= 3) {
        return current
      }
      return [...current, cor]
    })
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        submit(false)
      }}
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="jogo-titulo">Título</FieldLabel>
        <FieldContent>
          <Input
            id="jogo-titulo"
            name="titulo"
            placeholder="Ex.: Escreva seu nome"
            maxLength={200}
            value={titulo}
            onChange={(event) => {
              setTitulo(event.target.value)
              clearError('titulo')
            }}
            aria-invalid={Boolean(errors.titulo)}
            className="h-14 rounded-full border-transparent bg-white px-5 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base"
          />
          {errors.titulo && <FieldError>{errors.titulo}</FieldError>}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="jogo-categoria">Categoria</FieldLabel>
        <FieldContent>
          <div className="relative">
            <span aria-hidden="true" className="absolute left-5 top-1/2 -translate-y-1/2">
              <PencilSimple weight="bold" className="size-5 text-purple" />
            </span>
            <Input
              id="jogo-categoria"
              name="categoria"
              list="categorias-sugeridas"
              placeholder="Ex.: Coordenação motora"
              maxLength={50}
              value={categoria}
              onChange={(event) => {
                setCategoria(event.target.value)
                clearError('categoria')
              }}
              aria-invalid={Boolean(errors.categoria)}
              className="h-14 rounded-full border-transparent bg-white pl-14 pr-5 text-base font-medium text-navy shadow-clay-sm placeholder:text-muted-foreground md:text-base"
            />
            <datalist id="categorias-sugeridas">
              {CATEGORIAS_SUGERIDAS.map((slug) => (
                <option key={slug} value={slug} />
              ))}
            </datalist>
          </div>
          {errors.categoria && <FieldError>{errors.categoria}</FieldError>}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="jogo-descricao">Descrição</FieldLabel>
        <FieldContent>
          <textarea
            id="jogo-descricao"
            name="descricao"
            placeholder="O que a criança vai fazer nesse jogo?"
            maxLength={5000}
            rows={3}
            value={descricao}
            onChange={(event) => {
              setDescricao(event.target.value)
              clearError('descricao')
            }}
            aria-invalid={Boolean(errors.descricao)}
            className="w-full resize-y rounded-3xl border-transparent bg-white px-5 py-4 text-base font-medium text-navy shadow-clay-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-turquoise focus-visible:ring-3 focus-visible:ring-turquoise/30 md:text-base"
          />
          {errors.descricao && <FieldError>{errors.descricao}</FieldError>}
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="jogo-tutorial">Tutorial</FieldLabel>
        <FieldContent>
          <textarea
            id="jogo-tutorial"
            name="tutorial"
            placeholder="Passo a passo que a criança lê antes de jogar"
            maxLength={5000}
            rows={3}
            value={tutorial}
            onChange={(event) => {
              setTutorial(event.target.value)
              clearError('tutorial')
            }}
            aria-invalid={Boolean(errors.tutorial)}
            className="w-full resize-y rounded-3xl border-transparent bg-white px-5 py-4 text-base font-medium text-navy shadow-clay-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-turquoise focus-visible:ring-3 focus-visible:ring-turquoise/30 md:text-base"
          />
          {errors.tutorial && <FieldError>{errors.tutorial}</FieldError>}
        </FieldContent>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-navy">Quem pode ver o jogo?</legend>
        <ToggleGroup
          value={[visibilidade]}
          onValueChange={(next) => {
            const nextValue = next[0]
            if (nextValue) {
              setVisibilidade(nextValue as 'public' | 'private')
            }
          }}
          className="gap-2"
        >
          <ToggleGroupItem
            value="public"
            className="h-12 gap-2 rounded-full bg-white px-6 text-sm font-bold text-navy shadow-clay-sm transition-colors data-[state=on]:bg-turquoise data-[state=on]:text-white"
          >
            <GlobeSimple weight="bold" aria-hidden="true" className="size-5" />
            Público
          </ToggleGroupItem>
          <ToggleGroupItem
            value="private"
            className="h-12 gap-2 rounded-full bg-white px-6 text-sm font-bold text-navy shadow-clay-sm transition-colors data-[state=on]:bg-purple data-[state=on]:text-white"
          >
            <LockSimple weight="bold" aria-hidden="true" className="size-5" />
            Privado
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs font-medium text-muted-foreground">
          {visibilidade === 'public'
            ? 'Todas as famílias veem na tela de jogos quando publicado.'
            : 'Só aparece para quem você indicar (tarefas de casa).'}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-bold text-navy">
          Cores do jogo — até 3, a primeira vira o fundo da thumbnail
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {PALETA_CORES.map((cor) => {
            const selected = cores.includes(cor)
            return (
              <button
                key={cor}
                type="button"
                onClick={() => toggleCor(cor)}
                aria-pressed={selected}
                aria-label={`Cor ${cor}${selected ? ' — selecionada' : ''}`}
                className={cn(
                  'flex size-11 items-center justify-center rounded-full shadow-clay-sm transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0',
                  selected && 'ring-3 ring-navy/25',
                )}
                style={{ backgroundColor: cor }}
              >
                {selected && (
                  <Check
                    weight="bold"
                    aria-hidden="true"
                    className="size-5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.4)]"
                  />
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* Seção Comportamento do Traçado (Ticket A4: Gestão do Profissional) */}
      <TracingBehaviorSection config={tracingConfig} onChange={setTracingConfig} />

      <div className="grid gap-5 sm:grid-cols-3">
        <FileUploadField
          kind="svg"
          rule={SVG_UPLOAD_RULE}
          description="Arquivo SVG com o traçado — até 500 KB"
          file={svgFile}
          existingUrl={game?.svg_url}
          onChange={setSvgFile}
        />
        <FileUploadField
          kind="thumb"
          rule={IMAGE_UPLOAD_RULE}
          description="PNG, JPG, WebP ou SVG — até 1 MB"
          file={thumbFile}
          existingUrl={game?.thumb_url}
          onChange={setThumbFile}
        />
        <FileUploadField
          kind="banner"
          rule={IMAGE_UPLOAD_RULE}
          description="PNG, JPG, WebP ou SVG — até 1 MB"
          file={bannerFile}
          existingUrl={game?.banner_url}
          onChange={setBannerFile}
        />
      </div>

      {submitError && (
        <p
          role="alert"
          className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-bold text-coral-dark"
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-navy/10 bg-white px-6 text-base font-bold text-navy shadow-clay-sm transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-navy/10 bg-white px-6 text-base font-bold text-navy shadow-clay-sm transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 sm:flex-none"
        >
          <FloppyDiskBack weight="bold" aria-hidden="true" className="size-5 text-turquoise" />
          Salvar rascunho
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={submitting}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-blue px-6 text-base font-bold text-white shadow-clay-btn transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
        >
          <PaperPlaneTilt weight="bold" aria-hidden="true" className="size-5" />
          {submitting ? 'Salvando...' : game ? 'Salvar e publicar' : 'Criar e publicar'}
        </button>
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        <FileText aria-hidden="true" className="mr-1 inline size-3.5" />
        Publicar deixa o jogo visível para as famílias na tela de jogos do modo criança.
      </p>
    </form>
  )
}
