/**
 * Seção de configuração do comportamento do traçado para o formulário de jogos (Ticket A4).
 * Contém seletor do conjunto imutável de glifos com preview, limiar de pontuação (padrão 70),
 * três modos de contato e opções de pausa (0s, 1s, 1.5s padrão, 2s, 3s).
 */

import {
  Check,
  CheckCircle,
  Eye,
  HandTap,
  PencilSimple,
  SlidersHorizontal,
  Timer,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'

import { getGlyphGeometry, IMMUTABLE_GLYPH_CATALOG_KEYS } from '@/lib/tracing/geometry'
import type { GlyphGeometry, TracingGameConfig, TracingMode } from '@/lib/tracing/types'
import { cn } from '@/lib/utils'

export interface TracingBehaviorSectionProps {
  config: TracingGameConfig
  onChange: (nextConfig: TracingGameConfig) => void
  error?: string | null
}

const MODOS_CONTATO: Array<{
  value: TracingMode
  label: string
  desc: string
  icon: typeof PencilSimple
}> = [
  {
    value: 'strict_continuous',
    label: 'Contínuo estrito',
    desc: 'Exige traço contínuo sem soltar o dedo até concluir a letra.',
    icon: PencilSimple,
  },
  {
    value: 'timed_pause',
    label: 'Pausa com prazo',
    desc: 'Permite soltar o dedo temporariamente durante o prazo de tolerância.',
    icon: Timer,
  },
  {
    value: 'free',
    label: 'Livre',
    desc: 'Acumula o traçado através de múltiplos toques sem contagem regressiva.',
    icon: HandTap,
  },
]

const OPCOES_PAUSA: Array<{ seconds: number; label: string; isDefault?: boolean }> = [
  { seconds: 0, label: '0s (imediato)' },
  { seconds: 1.0, label: '1s' },
  { seconds: 1.5, label: '1,5s (padrão)', isDefault: true },
  { seconds: 2.0, label: '2s' },
  { seconds: 3.0, label: '3s' },
]

export function TracingBehaviorSection({ config, onChange, error }: TracingBehaviorSectionProps) {
  const [previewChar, setPreviewChar] = useState<string>(config.allowedGlyphs[0] ?? 'A')

  const previewGeometry: GlyphGeometry | null = useMemo(() => {
    try {
      return getGlyphGeometry(previewChar)
    } catch {
      return null
    }
  }, [previewChar])

  const toggleGlyph = (char: string) => {
    const isSelected = config.allowedGlyphs.includes(char)
    let nextAllowed: string[]
    if (isSelected) {
      if (config.allowedGlyphs.length <= 1) {
        return // Mantém ao menos um glifo selecionado
      }
      nextAllowed = config.allowedGlyphs.filter((c) => c !== char)
    } else {
      nextAllowed = [...config.allowedGlyphs, char]
    }
    onChange({ ...config, allowedGlyphs: nextAllowed })
  }

  const selectAllGlyphs = () => {
    onChange({ ...config, allowedGlyphs: [...IMMUTABLE_GLYPH_CATALOG_KEYS] })
  }

  const clearNonVowels = () => {
    const vowels = ['A', 'E', 'I', 'O', 'U', 'Á', 'É', 'Í', 'Ó', 'Ú']
    onChange({
      ...config,
      allowedGlyphs: IMMUTABLE_GLYPH_CATALOG_KEYS.filter((c) => vowels.includes(c)),
    })
  }

  return (
    <div className="rounded-3xl border-2 border-kid-bg bg-kid-card/40 p-5 sm:p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-kid-bg pb-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-blue/15 text-blue shadow-sm">
          <SlidersHorizontal weight="bold" className="size-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-navy">Comportamento do traçado</h2>
          <p className="text-xs sm:text-sm text-kid-muted font-medium">
            Parâmetros de precisão, modos de contato e letras disponíveis para o exercício
          </p>
        </div>
      </div>

      {/* 1. Modo de Contato */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-bold text-navy">Modo de contato</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {MODOS_CONTATO.map((m) => {
            const isSelected = config.mode === m.value
            const Icon = m.icon
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onChange({ ...config, mode: m.value })}
                aria-pressed={isSelected}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl p-4 text-left border-2 transition-all',
                  isSelected
                    ? 'border-blue bg-blue/10 shadow-clay-sm text-navy'
                    : 'border-kid-bg bg-white hover:border-blue/30 text-navy',
                )}
              >
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
                <span className="text-sm font-extrabold">{m.label}</span>
                <span className="text-xs text-kid-muted font-medium leading-snug">{m.desc}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {/* 2. Opções de Prazo de Pausa (Quando modo é timed_pause) */}
      {config.mode === 'timed_pause' && (
        <fieldset className="flex flex-col gap-2 bg-white/70 p-4 rounded-2xl border border-kid-bg">
          <legend className="text-sm font-bold text-navy">Prazo de tolerância de pausa</legend>
          <div className="flex flex-wrap gap-2 pt-1">
            {OPCOES_PAUSA.map((opt) => {
              const isSelected = config.graceDurationSeconds === opt.seconds
              return (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => onChange({ ...config, graceDurationSeconds: opt.seconds })}
                  aria-pressed={isSelected}
                  className={cn(
                    'h-10 px-4 rounded-full text-xs sm:text-sm font-bold transition-all',
                    isSelected
                      ? 'bg-blue text-white shadow-clay-sm'
                      : 'bg-kid-bg text-navy hover:bg-border',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-kid-muted font-medium mt-1">
            Tempo em segundos que a criança pode ficar sem tocar na tela antes de reiniciar o
            traçado.
          </p>
        </fieldset>
      )}

      {/* 3. Limiar de Conclusão (Threshold) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="tracing-threshold-input" className="text-sm font-bold text-navy">
            Limiar de precisão para conclusão
          </label>
          <span className="text-sm font-extrabold text-blue bg-blue/15 px-3 py-1 rounded-full">
            {config.completionThreshold}% {config.completionThreshold === 70 && '(padrão)'}
          </span>
        </div>

        <input
          id="tracing-threshold-input"
          type="range"
          min="40"
          max="95"
          step="5"
          value={config.completionThreshold}
          onChange={(e) =>
            onChange({
              ...config,
              completionThreshold: Number(e.target.value),
            })
          }
          className="w-full h-2 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
        />
        <div className="flex justify-between text-[11px] font-bold text-kid-muted px-1">
          <span>Mais tolerante (40%)</span>
          <span className="text-blue font-black">Recomendado (70%)</span>
          <span>Mais rigoroso (95%)</span>
        </div>
      </div>

      {/* 4. Seletor do Catálogo Imutável de Glifos + Pré-visualização */}
      <fieldset className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-bold text-navy">
            Letras permitidas no exercício ({config.allowedGlyphs.length} de{' '}
            {IMMUTABLE_GLYPH_CATALOG_KEYS.length})
          </legend>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllGlyphs}
              className="text-xs font-bold text-blue hover:underline"
            >
              Selecionar todas
            </button>
            <span className="text-kid-muted text-xs">•</span>
            <button
              type="button"
              onClick={clearNonVowels}
              className="text-xs font-bold text-blue hover:underline"
            >
              Apenas vogais
            </button>
          </div>
        </div>

        {/* Grade com os 39 caracteres do catálogo canônico imutável */}
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-13 gap-1.5 p-3 rounded-2xl bg-white border border-kid-bg max-h-48 overflow-y-auto">
          {IMMUTABLE_GLYPH_CATALOG_KEYS.map((char) => {
            const isSelected = config.allowedGlyphs.includes(char)
            const isPreviewing = previewChar === char
            return (
              <button
                key={char}
                type="button"
                onClick={() => {
                  toggleGlyph(char)
                  setPreviewChar(char)
                }}
                aria-pressed={isSelected}
                className={cn(
                  'relative size-9 rounded-xl font-black text-sm flex items-center justify-center transition-all',
                  isSelected
                    ? 'bg-blue text-white shadow-sm'
                    : 'bg-kid-bg/60 text-kid-muted hover:bg-kid-bg',
                  isPreviewing && 'ring-2 ring-navy ring-offset-1',
                )}
              >
                {char}
                {isSelected && (
                  <Check
                    weight="bold"
                    className="absolute -top-1 -right-1 size-3 text-white bg-navy rounded-full p-0.5"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Pré-visualização da Geometria da Letra Selecionada */}
        {previewGeometry && (
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-kid-bg">
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
                    stroke="#e5e5e5"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                ))}
                {previewGeometry.strokes.map((s) => (
                  <path
                    key={`pv_center_${s.id}`}
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
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Eye weight="bold" className="size-4 text-blue" />
                <span className="text-xs font-extrabold text-navy uppercase">
                  Pré-visualização: {previewGeometry.label}
                </span>
              </div>
              <span className="text-xs text-kid-muted font-medium">
                {previewGeometry.strokes.length} traço(s) guia • Tolerância:{' '}
                {Math.round(previewGeometry.toleranceRadius * 100)}%
              </span>
              <span className="text-[11px] text-kid-muted">
                {config.allowedGlyphs.includes(previewChar)
                  ? 'Ativa para este jogo'
                  : 'Desativada (não aparecerá)'}
              </span>
            </div>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-xs font-bold text-coral bg-coral/10 p-3 rounded-xl">
          {error}
        </p>
      )}
    </div>
  )
}
