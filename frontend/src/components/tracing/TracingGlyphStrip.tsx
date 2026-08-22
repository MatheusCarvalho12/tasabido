/**
 * Faixa de letras do nome da criança (Ticket A3).
 * Exibe as letras do primeiro nome, destacando a letra atual e marcando letras já completadas.
 */

import { Check } from '@phosphor-icons/react'

export interface TracingGlyphStripProps {
  glyphs: string[]
  currentIndex: number
  completedIndices: Set<number>
  className?: string
}

export function TracingGlyphStrip({
  glyphs,
  currentIndex,
  completedIndices,
  className = '',
}: TracingGlyphStripProps) {
  const glyphItems = glyphs.map((char, index) => ({
    id: `glyph_item_${char}_${index}`,
    char,
    index,
  }))

  return (
    <nav
      aria-label="Letras do seu nome"
      className={`flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 bg-kid-card/80 backdrop-blur-sm rounded-full shadow-clay-sm border border-kid-bg ${className}`}
    >
      {glyphItems.map(({ id, char, index }) => {
        const isCurrent = index === currentIndex
        const isDone = completedIndices.has(index)

        let badgeStyle = 'bg-kid-bg text-muted-foreground border-transparent opacity-60'
        if (isCurrent) {
          badgeStyle =
            'bg-blue text-white ring-4 ring-blue/30 scale-110 shadow-clay-btn font-extrabold'
        } else if (isDone) {
          badgeStyle = 'bg-kid-star text-navy border-amber-300 font-bold shadow-sm'
        }

        return (
          <div
            key={id}
            className={`relative size-10 sm:size-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl transition-all duration-300 ${badgeStyle}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span>{char}</span>
            {isDone && (
              <span className="absolute -top-1 -right-1 bg-kid-turquoise text-white size-4 rounded-full flex items-center justify-center shadow-sm">
                <Check weight="bold" className="size-3" />
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
