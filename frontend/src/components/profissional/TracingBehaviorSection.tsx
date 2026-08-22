/**
 * Seção de configuração de comportamento de traçado para o formulário do jogo (Ticket A4).
 * Segue o contrato do produto:
 * - Conjuntos de glifos atômicos e imutáveis com ID, versão e hash SHA-256 (nunca letras parciais individuais).
 * - Pré-visualização de amostra puramente para inspeção visual (não altera o conjunto).
 * - Modos de contato com semântica de radio nativa acessível.
 * - Limiar de precisão de 0 a 100 com padrão 70.
 * - Prazos de pausa de 0s a 3s com padrão 1,5s claramente identificado.
 */

import {
  CheckCircle,
  Clock,
  Eye,
  type HandPointing,
  PencilSimple,
  SlidersHorizontal,
  Sparkle,
} from '@phosphor-icons/react'
import { useState } from 'react'

import { getGlyphGeometry, IMMUTABLE_GLYPH_CATALOG_KEYS } from '@/lib/tracing/geometry'
import {
  CANONICAL_GLYPH_SET_ID,
  DEFAULT_TRACING_GAME_CONFIG,
  type GlyphSetDefinition,
  IMMUTABLE_GLYPH_SETS,
  type TracingGameConfig,
  type TracingMode,
} from '@/lib/tracing/types'
import { cn } from '@/lib/utils'

export interface TracingBehaviorSectionProps {
  config?: TracingGameConfig
  onChange: (config: TracingGameConfig) => void
  disabled?: boolean
}

const MODOS_CONTATO: Array<{
  id: TracingMode
  title: string
  description: string
  icon: typeof HandPointing
}> = [
  {
    id: 'strict_continuous',
    title: 'Contínuo estrito',
    description: 'Exige traço contínuo sem soltar o dedo até concluir a letra.',
    icon: PencilSimple,
  },
  {
    id: 'timed_pause',
    title: 'Pausa com prazo',
    description: 'Permite soltar o dedo temporariamente durante o prazo de tolerância.',
    icon: Clock,
  },
  {
    id: 'free',
    title: 'Livre',
    description: 'Acumula o traçado entre múltiplos toques sem resetar ao soltar.',
    icon: Sparkle,
  },
]

const PRAZOS_PAUSA: Array<{ value: number; label: string }> = [
  { value: 0, label: '0s (imediato)' },
  { value: 1.0, label: '1s' },
  { value: 1.5, label: '1,5s (padrão)' },
  { value: 2.0, label: '2s' },
  { value: 3.0, label: '3s' },
]

export function TracingBehaviorSection({
  config = DEFAULT_TRACING_GAME_CONFIG,
  onChange,
  disabled = false,
}: TracingBehaviorSectionProps) {
  // Letra selecionada estritamente para inspeção visual do traçado
  const [inspectionChar, setInspectionChar] = useState<string>('A')

  const availableSets = Object.values(IMMUTABLE_GLYPH_SETS)
  const defaultSet = IMMUTABLE_GLYPH_SETS[CANONICAL_GLYPH_SET_ID]
  const currentSet: GlyphSetDefinition = IMMUTABLE_GLYPH_SETS[config.glyphSetId] ??
    defaultSet ?? {
      id: CANONICAL_GLYPH_SET_ID,
      name: 'Maiúsculas bloco',
      version: '1.0.0',
      hash: '',
      description: '',
      glyphCount: 39,
      glyphs: [],
    }

  const handleSetChange = (setId: string) => {
    const setDef = IMMUTABLE_GLYPH_SETS[setId]
    if (!setDef) return
    onChange({
      ...config,
      glyphSetId: setDef.id,
      glyphSetVersion: setDef.version,
      glyphSetHash: setDef.hash,
    })
  }

  const handleModeChange = (mode: TracingMode) => {
    onChange({
      ...config,
      mode,
    })
  }

  const handleGraceChange = (graceDurationSeconds: number) => {
    onChange({
      ...config,
      graceDurationSeconds,
    })
  }

  const handleThresholdChange = (completionThreshold: number) => {
    onChange({
      ...config,
      completionThreshold,
    })
  }

  const previewGeometry = getGlyphGeometry(inspectionChar)

  return (
    <section
      aria-labelledby="tracing-behavior-title"
      className="rounded-3xl border-2 border-kid-bg bg-kid-card/40 p-5 sm:p-6 flex flex-col gap-6 shadow-sm"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex items-center gap-3 border-b border-kid-bg pb-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-blue/15 text-blue shadow-sm">
          <SlidersHorizontal weight="bold" className="size-6" />
        </div>
        <div>
          <h2 id="tracing-behavior-title" className="text-lg sm:text-xl font-extrabold text-navy">
            Comportamento do traçado
          </h2>
          <p className="text-xs sm:text-sm text-kid-muted font-medium">
            Parâmetros de precisão, modos de contato e conjunto canônico de letras
          </p>
        </div>
      </div>

      {/* 1. Seleção do Conjunto Completo e Atômico de Glifos */}
      <fieldset className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-bold text-navy">
            Conjunto de letras e estilo (Catálogo de pré-visualização)
          </legend>
          <span className="text-xs font-bold text-blue bg-blue/15 px-2.5 py-0.5 rounded-full">
            {currentSet.glyphCount} caracteres
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-1">
          {availableSets.map((setDef) => {
            const isSelected = config.glyphSetId === setDef.id
            return (
              <label
                key={setDef.id}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl p-4 text-left border-2 transition-all cursor-pointer relative',
                  isSelected
                    ? 'border-blue bg-blue/10 shadow-clay-sm text-navy'
                    : 'border-kid-bg bg-white hover:border-blue/30 text-navy',
                )}
              >
                <input
                  type="radio"
                  name="glyphSetRadio"
                  value={setDef.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => handleSetChange(setDef.id)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold">{setDef.name}</span>
                    <span className="text-xs font-bold text-kid-muted">v{setDef.version}</span>
                  </div>
                  {isSelected && <CheckCircle weight="fill" className="size-5 text-blue" />}
                </div>

                <p className="text-xs text-kid-muted font-medium">{setDef.description}</p>

                <div className="flex items-center gap-2 text-[11px] font-mono text-kid-muted pt-1 border-t border-kid-bg/60">
                  <span className="font-bold">Hash (pré-visualização):</span>
                  <span className="truncate">{setDef.hash}</span>
                </div>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* 2. Pré-visualização da Amostra (Apenas para inspeção visual; não altera o conjunto) */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white border border-kid-bg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye weight="bold" className="size-4 text-blue" />
            <span className="text-xs font-extrabold uppercase text-navy">
              Inspeção visual de amostra
            </span>
          </div>
          <span className="text-[11px] text-kid-muted font-medium">
            Letra em inspeção: <strong className="text-navy">{inspectionChar}</strong>
          </span>
        </div>

        <p className="text-xs text-kid-muted">
          A escolha abaixo serve exclusivamente para auditar visualmente a geometria do traçado no
          painel de preview e não altera a composição do conjunto atômico.
        </p>

        {/* Seletor de letra para inspeção visual */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {IMMUTABLE_GLYPH_CATALOG_KEYS.map((char) => {
            const isInspecting = inspectionChar === char
            return (
              <button
                key={`inspect_${char}`}
                type="button"
                onClick={() => setInspectionChar(char)}
                disabled={disabled}
                className={cn(
                  'size-8 rounded-lg text-xs font-black transition-all shrink-0 flex items-center justify-center',
                  isInspecting
                    ? 'bg-blue text-white shadow-clay-sm ring-2 ring-blue/20'
                    : 'bg-kid-bg/60 text-navy hover:bg-kid-bg',
                )}
              >
                {char}
              </button>
            )
          })}
        </div>

        {/* Pré-visualização da Geometria da Letra Inspecionada */}
        {previewGeometry && (
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-cream border border-kid-bg mt-1">
            <div className="size-20 rounded-xl bg-white border-2 border-kid-bg flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              <svg
                viewBox="0 0 100 100"
                className="size-16"
                aria-label={`Pré-visualização do traçado da ${previewGeometry.label}`}
              >
                {previewGeometry.strokes.map((s) => (
                  <path
                    key={`pv_bg_${s.id}`}
                    d={s.pathData}
                    fill="none"
                    stroke="#e8edf5"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {previewGeometry.strokes.map((s) => (
                  <path
                    key={`pv_fg_${s.id}`}
                    d={s.pathData}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3"
                    strokeDasharray="4 4"
                  />
                ))}
                {previewGeometry.strokes.map((s) => (
                  <circle
                    key={`pv_dot_${s.id}`}
                    cx={s.startPoint.x * 100}
                    cy={s.startPoint.y * 100}
                    r="4"
                    fill="#000000"
                  />
                ))}
              </svg>
            </div>
            <div className="flex flex-col gap-0.5 text-xs text-navy">
              <span className="font-black text-sm text-blue">
                Pré-visualização: Letra {previewGeometry.character}
              </span>
              <span className="text-kid-muted font-medium">
                {previewGeometry.strokes.length} segmento(s) de traço • Tolerância padrão:{' '}
                {Math.round(previewGeometry.toleranceRadius * 100)}%
              </span>
              <span className="text-[11px] text-kid-muted">
                Início guiado por ponto preto sólido
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Modo de Contato (Radiogroup semântico nativo) */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold text-navy">Modo de contato</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODOS_CONTATO.map((modo) => {
            const isSelected = config.mode === modo.id
            const Icon = modo.icon
            return (
              <label
                key={modo.id}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl p-4 text-left border-2 transition-all cursor-pointer relative',
                  isSelected
                    ? 'border-blue bg-blue/10 shadow-clay-sm text-navy'
                    : 'border-kid-bg bg-white hover:border-blue/30 text-navy',
                )}
              >
                <input
                  type="radio"
                  name="contactModeRadio"
                  value={modo.id}
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => handleModeChange(modo.id)}
                  className="sr-only"
                />
                <div className="flex items-center justify-between w-full">
                  <div
                    className={cn(
                      'size-8 rounded-xl flex items-center justify-center',
                      isSelected ? 'bg-blue text-white' : 'bg-kid-bg text-navy',
                    )}
                  >
                    <Icon weight="bold" className="size-4" />
                  </div>
                  {isSelected && <CheckCircle weight="fill" className="size-5 text-blue" />}
                </div>
                <span className="text-sm font-extrabold">{modo.title}</span>
                <span className="text-xs text-kid-muted font-medium leading-snug">
                  {modo.description}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* 4. Prazo de Pausa (Apenas para modo timed_pause) */}
      {config.mode === 'timed_pause' && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-bold text-navy">Prazo de tolerância da pausa</legend>
          <div className="flex flex-wrap gap-2">
            {PRAZOS_PAUSA.map((prazo) => {
              const isSelected = config.graceDurationSeconds === prazo.value
              return (
                <label
                  key={prazo.value}
                  className={cn(
                    'h-11 px-4 rounded-full text-xs font-bold transition-all border flex items-center justify-center cursor-pointer',
                    isSelected
                      ? 'bg-blue text-white border-blue shadow-clay-sm'
                      : 'bg-white text-navy border-kid-bg hover:bg-kid-bg/50',
                  )}
                >
                  <input
                    type="radio"
                    name="pauseGraceRadio"
                    value={prazo.value}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => handleGraceChange(prazo.value)}
                    className="sr-only"
                  />
                  <span>{prazo.label}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* 5. Limiar de Precisão para Conclusão (0..100, padrão 70) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label htmlFor="tracing-threshold-range" className="text-sm font-bold text-navy">
            Limiar de precisão para conclusão
          </label>
          <span className="text-sm font-extrabold text-blue bg-blue/15 px-3 py-1 rounded-full">
            {config.completionThreshold}% {config.completionThreshold === 70 && '(padrão)'}
          </span>
        </div>

        <input
          id="tracing-threshold-range"
          type="range"
          min="0"
          max="100"
          step="5"
          value={config.completionThreshold}
          disabled={disabled}
          onChange={(e) => handleThresholdChange(Number(e.target.value))}
          className="w-full h-2.5 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
        />

        <div className="flex items-center justify-between text-xs text-kid-muted font-bold px-1">
          <span>Mais flexível (0%)</span>
          <span className="text-blue font-black">Recomendado (70%)</span>
          <span>Mais rigoroso (100%)</span>
        </div>
      </div>
    </section>
  )
}
