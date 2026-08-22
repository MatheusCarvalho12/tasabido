/**
 * Modal de configuração e override individual de traçado por atribuição à criança (Tickets A4 & A5).
 * Permite ao profissional ajustar parâmetros específicos para uma atribuição de criança (com herança e reset).
 * Segue o contrato do produto:
 * - Overrides de conjunto de glifos são atômicos e por ID de conjunto (nunca letras individuais).
 * - Modos de contato com semântica de radio nativa acessível.
 * - Limiar de 0 a 100 com padrão 70.
 * - Ação de reset para herdar valores do jogo.
 */

import {
  ArrowCounterClockwise,
  CheckCircle,
  FloppyDiskBack,
  SlidersHorizontal,
  X,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'

import { fetchGlyphSetsCatalogApi } from '@/lib/tracing/adapter'
import {
  CANONICAL_GLYPH_SET_ID,
  DEFAULT_TRACING_GAME_CONFIG,
  type GlyphSetDefinition,
  IMMUTABLE_GLYPH_SETS,
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
  assignmentId?: number
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
  assignmentId,
  gameConfig = DEFAULT_TRACING_GAME_CONFIG,
  existingOverride,
  isOpen,
  onClose,
  onSave,
  onReset,
}: ChildAssignmentOverrideModalProps) {
  const [overrideGlyphSetId, setOverrideGlyphSetId] = useState<string | null>(
    existingOverride?.glyphSetId ?? null,
  )
  const [overrideMode, setOverrideMode] = useState<TracingMode | null>(
    existingOverride?.mode ?? null,
  )
  const [overrideThreshold, setOverrideThreshold] = useState<number | null>(
    existingOverride?.completionThreshold ?? null,
  )
  const [overrideGrace, setOverrideGrace] = useState<number | null>(
    existingOverride?.graceDurationSeconds ?? null,
  )
  const [dynamicSets, setDynamicSets] = useState<GlyphSetDefinition[]>([])

  useEffect(() => {
    if (existingOverride) {
      setOverrideGlyphSetId(existingOverride.glyphSetId ?? null)
      setOverrideMode(existingOverride.mode ?? null)
      setOverrideThreshold(existingOverride.completionThreshold ?? null)
      setOverrideGrace(existingOverride.graceDurationSeconds ?? null)
    }
  }, [existingOverride])

  useEffect(() => {
    void fetchGlyphSetsCatalogApi()
      .then((res) => {
        if (res?.items && res.items.length > 0) {
          const mapped: GlyphSetDefinition[] = res.items.map((item) => ({
            id: String(item.id),
            numericId: item.id,
            name:
              item.style === 'uppercase-block' || item.style === 'maiusculas-bloco'
                ? 'Maiúsculas bloco'
                : item.style,
            version: item.version,
            hash: item.artifact_sha256 || item.sha256,
            description:
              'Conjunto completo de 39 caracteres maiúsculos em letra de forma (A-Z e acentos pt-BR: Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç, Ü).',
            glyphCount: Object.keys(item.geometry).length || 39,
            glyphs: Object.keys(item.geometry),
            geometry: item.geometry,
          }))
          setDynamicSets(mapped)
        }
      })
      .catch(() => {
        // Silencioso
      })
  }, [])

  const availableSets = dynamicSets.length > 0 ? dynamicSets : Object.values(IMMUTABLE_GLYPH_SETS)

  const currentOverride: TracingAssignmentOverride = {
    childId,
    childName,
    gameId,
    assignmentId: assignmentId ?? existingOverride?.assignmentId,
    glyphSetId: overrideGlyphSetId,
    mode: overrideMode,
    completionThreshold: overrideThreshold,
    graceDurationSeconds: overrideGrace,
  }

  const effective = resolveEffectiveTracingSettings(gameConfig, currentOverride)
  const defaultSet: GlyphSetDefinition = availableSets[0] ??
    IMMUTABLE_GLYPH_SETS[CANONICAL_GLYPH_SET_ID] ?? {
      id: CANONICAL_GLYPH_SET_ID,
      name: 'Maiúsculas bloco',
      version: '1.0.0',
      hash: '',
      description: '',
      glyphCount: 39,
      glyphs: [],
    }
  const effectiveGlyphSet: GlyphSetDefinition =
    availableSets.find(
      (s) =>
        s.id === effective.glyphSetId ||
        String(s.numericId) === effective.glyphSetId ||
        s.id === String(gameConfig.numericGlyphSetId),
    ) ?? defaultSet

  if (!isOpen) return null

  const handleSave = () => {
    onSave(currentOverride)
    onClose()
  }

  const handleResetToInherited = () => {
    setOverrideGlyphSetId(null)
    setOverrideMode(null)
    setOverrideThreshold(null)
    setOverrideGrace(null)
    onReset()
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
                Jogo: {gameTitle} (personalização individual por atribuição)
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
              <span className="text-kid-muted block">Estilo/Letras</span>
              <strong className="text-navy">{effectiveGlyphSet.name}</strong>
              {effective.isOverridden.glyphSetId && (
                <span className="block text-[10px] text-blue font-bold">(Personalizado)</span>
              )}
            </div>
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
          </div>
        </div>

        {/* 1. Override do Conjunto Atômico de Letras */}
        <fieldset className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-bold text-navy">Conjunto de letras</legend>
            {overrideGlyphSetId !== null && (
              <button
                type="button"
                onClick={() => setOverrideGlyphSetId(null)}
                className="text-xs text-blue font-bold hover:underline"
              >
                Usar padrão do jogo ({effectiveGlyphSet.name})
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {availableSets.map((setDef) => {
              const isSelected = effective.glyphSetId === setDef.id
              return (
                <label
                  key={setDef.id}
                  className={cn(
                    'p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer relative',
                    isSelected
                      ? 'bg-blue/10 border-blue text-navy shadow-clay-sm'
                      : 'bg-white border-kid-bg text-navy hover:bg-kid-bg/50',
                  )}
                >
                  <input
                    type="radio"
                    name="overrideGlyphSetRadio"
                    value={setDef.id}
                    checked={isSelected}
                    onChange={() => setOverrideGlyphSetId(setDef.id)}
                    className="sr-only"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-extrabold">
                      {setDef.name} (v{setDef.version})
                    </span>
                    <span className="text-xs text-kid-muted">{setDef.description}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle weight="fill" className="size-5 text-blue shrink-0" />
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* 2. Override do Modo de Contato (Radiogroup semântico nativo) */}
        <fieldset className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-bold text-navy">Modo de contato</legend>
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
                <label
                  key={m}
                  className={cn(
                    'h-11 rounded-xl text-xs font-bold border transition-all flex items-center justify-center cursor-pointer',
                    isSelected
                      ? 'bg-blue text-white border-blue shadow-clay-sm'
                      : 'bg-white text-navy border-kid-bg hover:bg-kid-bg/50',
                  )}
                >
                  <input
                    type="radio"
                    name="overrideModeRadio"
                    value={m}
                    checked={isSelected}
                    onChange={() => setOverrideMode(m)}
                    className="sr-only"
                  />
                  <span>{MODOS_LABEL[m]}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* 3. Override do Limiar de Precisão (0..100) */}
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
            min="0"
            max="100"
            step="5"
            value={effective.completionThreshold}
            onChange={(e) => setOverrideThreshold(Number(e.target.value))}
            className="w-full h-2.5 bg-kid-bg rounded-lg appearance-none cursor-pointer accent-blue"
          />
        </div>

        {/* 4. Override do Prazo de Pausa */}
        <fieldset className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <legend className="text-sm font-bold text-navy">Prazo de pausa (segundos)</legend>
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
                <label
                  key={sec}
                  className={cn(
                    'h-9 px-3.5 rounded-full text-xs font-bold transition-all border flex items-center justify-center cursor-pointer',
                    isSelected
                      ? 'bg-blue text-white shadow-clay-sm border-blue'
                      : 'bg-white text-navy border-kid-bg hover:bg-kid-bg',
                  )}
                >
                  <input
                    type="radio"
                    name="overrideGraceRadio"
                    value={sec}
                    checked={isSelected}
                    onChange={() => setOverrideGrace(sec)}
                    className="sr-only"
                  />
                  <span>{sec === 1.5 ? '1,5s (padrão)' : `${sec}s`}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

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
