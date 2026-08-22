/**
 * Modal de configuração e override individual de traçado por criança (Ticket A4).
 * Permite ao profissional ajustar parâmetros específicos para uma criança (com herança e reset).
 */

import { ArrowCounterClockwise, FloppyDiskBack, SlidersHorizontal, X } from '@phosphor-icons/react'
import { useState } from 'react'

import { IMMUTABLE_GLYPH_CATALOG_KEYS } from '@/lib/tracing/geometry'
import {
  DEFAULT_TRACING_GAME_CONFIG,
  resolveEffectiveTracingSettings,
  type TracingAssignmentOverride,
  type TracingGameConfig,
  type TracingMode,
} from '@/lib/tracing/types'
import { cn } from '@/lib/utils'

export interface ChildAssignmentOverrideModalProps {
  childId: string
  childName: string
  gameId: number
  gameTitle: string
  gameConfig?: TracingGameConfig
  existingOverride?: TracingAssignmentOverride | null
  isOpen: boolean
  onClose: () => void
  onSave: (override: TracingAssignmentOverride) => void
  onReset: () => void
}

const MODOS_LABEL: Record<TracingMode, string> = {
  strict_continuous: 'Contínuo estrito',
  timed_pause: 'Pausa com prazo',
  free: 'Livre',
}

export function ChildAssignmentOverrideModal({
  childId,
  childName,
  gameId,
  gameTitle,
  gameConfig = DEFAULT_TRACING_GAME_CONFIG,
  existingOverride,
  isOpen,
  onClose,
  onSave,
  onReset,
}: ChildAssignmentOverrideModalProps) {
  const [overrideMode, setOverrideMode] = useState<TracingMode | null>(
    existingOverride?.mode ?? null,
  )
  const [overrideThreshold, setOverrideThreshold] = useState<number | null>(
    existingOverride?.completionThreshold ?? null,
  )
  const [overrideGrace, setOverrideGrace] = useState<number | null>(
    existingOverride?.graceDurationSeconds ?? null,
  )
  const [overrideGlyphs, setOverrideGlyphs] = useState<string[] | null>(
    existingOverride?.allowedGlyphs ?? null,
  )

  const currentOverride: TracingAssignmentOverride = {
    childId,
    childName,
    gameId,
    mode: overrideMode,
    completionThreshold: overrideThreshold,
    graceDurationSeconds: overrideGrace,
    allowedGlyphs: overrideGlyphs,
  }

  const effective = resolveEffectiveTracingSettings(gameConfig, currentOverride)

  if (!isOpen) return null

  const handleSave = () => {
    onSave(currentOverride)
    onClose()
  }

  const handleResetToInherited = () => {
    setOverrideMode(null)
    setOverrideThreshold(null)
    setOverrideGrace(null)
    setOverrideGlyphs(null)
    onReset()
  }

  const toggleGlyphOverride = (char: string) => {
    const activeList = overrideGlyphs ?? [...gameConfig.allowedGlyphs]
    let nextList: string[]
    if (activeList.includes(char)) {
      if (activeList.length <= 1) return
      nextList = activeList.filter((c) => c !== char)
    } else {
      nextList = [...activeList, char]
    }
    setOverrideGlyphs(nextList)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-card-in"
    >
      <div className="max-w-2xl w-full bg-cream rounded-3xl p-6 sm:p-8 shadow-kid-modal border-2 border-kid-bg flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-kid-bg pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue text-white shadow-clay-sm">
              <SlidersHorizontal weight="bold" className="size-6" />
            </div>
            <div>
              <h2
                id="override-modal-title"
                className="text-xl sm:text-2xl font-extrabold text-navy"
              >
                Ajustes de Traçado: {childName}
              </h2>
              <p className="text-xs sm:text-sm text-kid-muted font-medium">
                Jogo: {gameTitle} (personalização individual por criança)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="size-10 rounded-full bg-white border border-border flex items-center justify-center text-navy hover:bg-kid-bg"
          >
            <X weight="bold" className="size-5" />
          </button>
        </div>

        {/* Resumo da Herança vs Override */}
        <div className="p-4 rounded-2xl bg-white border border-kid-bg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-kid-muted">
              Configuração efetiva para {childName}
            </span>
            <button
              type="button"
              onClick={handleResetToInherited}
              className="text-xs font-bold text-blue hover:underline flex items-center gap-1"
            >
              <ArrowCounterClockwise weight="bold" className="size-3.5" />
              Resetar para padrão do jogo
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-kid-bg/50">
              <span className="text-kid-muted block">Modo</span>
              <strong className="text-navy">{MODOS_LABEL[effective.mode]}</strong>
              {effective.isOverridden.mode && (
                <span className="block text-[10px] text-blue font-bold">(Personalizado)</span>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-kid-bg/50">
              <span className="text-kid-muted block">Limiar</span>
              <strong className="text-navy">{effective.completionThreshold}%</strong>
              {effective.isOverridden.completionThreshold && (
                <span className="block text-[10px] text-blue font-bold">(Personalizado)</span>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-kid-bg/50">
              <span className="text-kid-muted block">Pausa</span>
              <strong className="text-navy">{effective.graceDurationSeconds}s</strong>
              {effective.isOverridden.graceDurationSeconds && (
                <span className="block text-[10px] text-blue font-bold">(Personalizado)</span>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-kid-bg/50">
              <span className="text-kid-muted block">Letras</span>
              <strong className="text-navy">{effective.allowedGlyphs.length} ativas</strong>
              {effective.isOverridden.allowedGlyphs && (
                <span className="block text-[10px] text-blue font-bold">(Personalizado)</span>
              )}
            </div>
          </div>
        </div>

        {/* 1. Override do Modo de Contato */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">Modo de contato</span>
            {overrideMode !== null && (
              <button
                type="button"
                onClick={() => setOverrideMode(null)}
                className="text-xs text-blue font-bold hover:underline"
              >
                Usar padrão do jogo ({MODOS_LABEL[gameConfig.mode]})
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['strict_continuous', 'timed_pause', 'free'] as TracingMode[]).map((m) => {
              const isSelected = effective.mode === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setOverrideMode(m)}
                  className={cn(
                    'h-11 rounded-xl text-xs font-bold border transition-all',
                    isSelected
                      ? 'bg-blue text-white border-blue shadow-clay-sm'
                      : 'bg-white text-navy border-kid-bg hover:bg-kid-bg/50',
                  )}
                >
                  {MODOS_LABEL[m]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Override do Limiar de Precisão */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="child-threshold-range" className="text-sm font-bold text-navy">
              Limiar de precisão
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue bg-blue/15 px-2 py-0.5 rounded-full">
                {effective.completionThreshold}%
              </span>
              {overrideThreshold !== null && (
                <button
                  type="button"
                  onClick={() => setOverrideThreshold(null)}
                  className="text-xs text-blue font-bold hover:underline"
                >
                  Usar padrão ({gameConfig.completionThreshold}%)
                </button>
              )}
            </div>
          </div>
          <input
            id="child-threshold-range"
            type="range"
            min="40"
            max="95"
            step="5"
            value={effective.completionThreshold}
            onChange={(e) => setOverrideThreshold(Number(e.target.value))}
            className="w-full h-2 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
          />
        </div>

        {/* 3. Override do Prazo de Pausa */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">Prazo de pausa (segundos)</span>
            {overrideGrace !== null && (
              <button
                type="button"
                onClick={() => setOverrideGrace(null)}
                className="text-xs text-blue font-bold hover:underline"
              >
                Usar padrão ({gameConfig.graceDurationSeconds}s)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 1.0, 1.5, 2.0, 3.0].map((sec) => {
              const isSelected = effective.graceDurationSeconds === sec
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setOverrideGrace(sec)}
                  className={cn(
                    'h-9 px-3.5 rounded-full text-xs font-bold transition-all',
                    isSelected
                      ? 'bg-blue text-white shadow-clay-sm'
                      : 'bg-white text-navy border border-kid-bg hover:bg-kid-bg',
                  )}
                >
                  {sec === 1.5 ? '1,5s' : `${sec}s`}
                </button>
              )
            })}
          </div>
        </div>

        {/* 4. Override de Letras Permitidas */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy">
              Letras permitidas ({effective.allowedGlyphs.length} ativas)
            </span>
            {overrideGlyphs !== null && (
              <button
                type="button"
                onClick={() => setOverrideGlyphs(null)}
                className="text-xs text-blue font-bold hover:underline"
              >
                Usar padrão do jogo
              </button>
            )}
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5 p-3 rounded-2xl bg-white border border-kid-bg max-h-36 overflow-y-auto">
            {IMMUTABLE_GLYPH_CATALOG_KEYS.map((char) => {
              const isSelected = effective.allowedGlyphs.includes(char)
              return (
                <button
                  key={char}
                  type="button"
                  onClick={() => toggleGlyphOverride(char)}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative size-8 rounded-lg font-black text-xs flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-blue text-white'
                      : 'bg-kid-bg/50 text-kid-muted hover:bg-kid-bg',
                  )}
                >
                  {char}
                </button>
              )
            })}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-kid-bg">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-full px-6 bg-white text-navy border border-border text-sm font-bold hover:bg-kid-bg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-12 rounded-full px-7 bg-blue text-white text-sm font-bold shadow-clay-btn flex items-center gap-2 hover:bg-blue-dark"
          >
            <FloppyDiskBack weight="bold" className="size-4" />
            Salvar personalização
          </button>
        </div>
      </div>
    </div>
  )
}
