/**
 * Mecanismo de pontuação do traçado (Ticket A1).
 * Fórmula congelada v1: overall = coverage * precision * engagement.
 * Engagement: valid trace length / (target length * 0.25), limitado a 1.0.
 * Garante que rabiscos generalizados não atinjam o limiar de 0.70.
 */

import { distance, distanceSquared } from './geometry'
import type { GlyphGeometry, Point, TracingScore, TracingStroke } from './types'

/**
 * Avalia se um ponto está dentro do corredor de tolerância da linha guia.
 */
export function isPointInsideCorridor(
  point: Point,
  targetSamples: Point[],
  toleranceRadius: number,
): boolean {
  const toleranceR2 = toleranceRadius * toleranceRadius
  for (let i = 0; i < targetSamples.length; i++) {
    if (distanceSquared(point, targetSamples[i]) <= toleranceR2) {
      return true
    }
  }
  return false
}

/**
 * Calcula a cobertura de pontos da linha guia do glifo.
 * Proporção de pontos amostrais atingidos por ao menos um ponto do traço dentro do raio de tolerância.
 */
export function calculateCoverage(
  strokes: TracingStroke[],
  glyph: GlyphGeometry,
): { coverage: number; coveredSampleCount: number; totalSampleCount: number } {
  const toleranceR2 = glyph.toleranceRadius * glyph.toleranceRadius

  const drawnPoints: Point[] = []
  for (let s = 0; s < strokes.length; s++) {
    const stroke = strokes[s]
    for (let p = 0; p < stroke.points.length; p++) {
      drawnPoints.push(stroke.points[p])
    }
  }

  if (drawnPoints.length === 0) {
    return { coverage: 0, coveredSampleCount: 0, totalSampleCount: 1 }
  }

  const allTargetSamples: Point[] = []
  for (let s = 0; s < glyph.strokes.length; s++) {
    allTargetSamples.push(...glyph.strokes[s].samplePoints)
  }

  if (allTargetSamples.length === 0) {
    return { coverage: 1, coveredSampleCount: 1, totalSampleCount: 1 }
  }

  let coveredCount = 0
  for (let t = 0; t < allTargetSamples.length; t++) {
    const target = allTargetSamples[t]
    let isCovered = false
    for (let d = 0; d < drawnPoints.length; d++) {
      if (distanceSquared(target, drawnPoints[d]) <= toleranceR2) {
        isCovered = true
        break
      }
    }
    if (isCovered) {
      coveredCount++
    }
  }

  const coverage = Math.min(1, Math.max(0, coveredCount / allTargetSamples.length))
  return {
    coverage,
    coveredSampleCount: coveredCount,
    totalSampleCount: allTargetSamples.length,
  }
}

/**
 * Calcula métricas de comprimento de traço válido e total.
 */
export function calculateTraceLengths(
  strokes: TracingStroke[],
  targetSamples: Point[],
  toleranceRadius: number,
): {
  totalLength: number
  validLength: number
  validPointsCount: number
  totalPointsCount: number
} {
  let totalLength = 0
  let validLength = 0
  let validPointsCount = 0
  let totalPointsCount = 0

  for (let s = 0; s < strokes.length; s++) {
    const pts = strokes[s].points
    totalPointsCount += pts.length
    if (pts.length === 0) continue

    let prevPoint = pts[0]
    let prevValid = isPointInsideCorridor(prevPoint, targetSamples, toleranceRadius)
    if (prevValid) validPointsCount++

    for (let p = 1; p < pts.length; p++) {
      const currPoint = pts[p]
      const currValid = isPointInsideCorridor(currPoint, targetSamples, toleranceRadius)
      if (currValid) validPointsCount++

      const segLen = distance(prevPoint, currPoint)
      totalLength += segLen

      // Segmento é válido se ambos os pontos ou a média estiver no corredor
      if (prevValid && currValid) {
        validLength += segLen
      } else if (prevValid || currValid) {
        validLength += segLen * 0.5
      }

      prevPoint = currPoint
      prevValid = currValid
    }
  }

  return { totalLength, validLength, validPointsCount, totalPointsCount }
}

/**
 * Calcula a precisão do traçado:
 * Proporção de traço dentro do corredor de tolerância sobre o comprimento total desenhado.
 */
export function calculatePrecision(strokes: TracingStroke[], glyph: GlyphGeometry): number {
  const allTargetSamples: Point[] = []
  for (let s = 0; s < glyph.strokes.length; s++) {
    allTargetSamples.push(...glyph.strokes[s].samplePoints)
  }

  const { totalLength, validLength, validPointsCount, totalPointsCount } = calculateTraceLengths(
    strokes,
    allTargetSamples,
    glyph.toleranceRadius,
  )

  if (totalPointsCount === 0) {
    return 1
  }

  if (totalLength > 0.01) {
    return Math.min(1, Math.max(0, validLength / totalLength))
  }

  return validPointsCount / totalPointsCount
}

/**
 * Calcula o engajamento conforme o contrato v1:
 * engagement = validTraceLength / (targetLength * 0.25), limitado a 1.0.
 */
export function calculateEngagement(strokes: TracingStroke[], glyph: GlyphGeometry): number {
  const allTargetSamples: Point[] = []
  for (let s = 0; s < glyph.strokes.length; s++) {
    allTargetSamples.push(...glyph.strokes[s].samplePoints)
  }

  const { validLength, validPointsCount } = calculateTraceLengths(
    strokes,
    allTargetSamples,
    glyph.toleranceRadius,
  )

  if (validPointsCount === 0) {
    return 0
  }

  const targetLength = Math.max(0.1, glyph.totalTargetLength)
  const engagementBaseline = targetLength * 0.25
  const engagement = Math.min(1.0, Math.max(0, validLength / engagementBaseline))

  // Se houver pontos válidos mesmo com comprimento ínfimo (ex: toque inicial), garante base mínima proporcional
  if (engagement === 0 && validPointsCount > 0) {
    return Math.min(0.2, validPointsCount * 0.02)
  }

  return engagement
}

/**
 * Calcula a pontuação completa e atualizada do traçado.
 * Fórmula congelada v1: overall = coverage * precision * engagement.
 */
export function calculateLiveScore(strokes: TracingStroke[], glyph: GlyphGeometry): TracingScore {
  let totalDrawnPoints = 0
  for (let s = 0; s < strokes.length; s++) {
    totalDrawnPoints += strokes[s].points.length
  }

  if (totalDrawnPoints === 0) {
    return {
      coverage: 0,
      precision: 1,
      engagement: 0,
      overall: 0,
    }
  }

  const { coverage } = calculateCoverage(strokes, glyph)
  const precision = calculatePrecision(strokes, glyph)
  const engagement = calculateEngagement(strokes, glyph)

  // Fórmula congelada v1: produto multiplicativo
  const rawOverall = coverage * precision * engagement
  const overall = Math.min(1, Math.max(0, Math.round(rawOverall * 1000) / 1000))

  return {
    coverage: Math.round(coverage * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    engagement: Math.round(engagement * 1000) / 1000,
    overall,
  }
}
