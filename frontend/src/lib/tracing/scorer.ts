/**
 * Mecanismo de pontuação ao vivo do traçado (coverage, precision, engagement).
 * A pontuação pode subir ou descer em tempo real conforme a criança desenha.
 */

import { distanceSquared } from './geometry'
import type { GlyphGeometry, Point, TracingScore, TracingStroke } from './types'

/**
 * Calcula a cobertura de pontos da linha guia do glifo.
 * Proporção de pontos amostrais atingidos por ao menos um ponto do traço dentro do raio de tolerância.
 */
export function calculateCoverage(
  strokes: TracingStroke[],
  glyph: GlyphGeometry,
): { coverage: number; coveredSampleCount: number; totalSampleCount: number } {
  const toleranceR2 = glyph.toleranceRadius * glyph.toleranceRadius

  // Coleta todos os pontos de todos os traços
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

  // Coleta todos os pontos amostrais de todos os traços do glifo
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
 * Calcula a precisão do traço em relação à linha guia.
 * Se a criança rabiscar muito fora da linha guia, a precisão cai drasticamente.
 */
export function calculatePrecision(strokes: TracingStroke[], glyph: GlyphGeometry): number {
  const allDrawnPoints: Point[] = []
  for (let s = 0; s < strokes.length; s++) {
    allDrawnPoints.push(...strokes[s].points)
  }

  if (allDrawnPoints.length === 0) {
    return 1
  }

  const allTargetSamples: Point[] = []
  for (let s = 0; s < glyph.strokes.length; s++) {
    allTargetSamples.push(...glyph.strokes[s].samplePoints)
  }

  if (allTargetSamples.length === 0) {
    return 1
  }

  const tolerance = glyph.toleranceRadius
  let totalPrecisionWeight = 0

  for (let i = 0; i < allDrawnPoints.length; i++) {
    const drawn = allDrawnPoints[i]
    let minDistance = Number.POSITIVE_INFINITY

    for (let j = 0; j < allTargetSamples.length; j++) {
      const d2 = distanceSquared(drawn, allTargetSamples[j])
      if (d2 < minDistance) {
        minDistance = d2
      }
    }

    const dist = Math.sqrt(minDistance)
    if (dist <= tolerance) {
      // Dentro do corredor: precisão alta entre 0.7 e 1.0
      totalPrecisionWeight += 1.0 - 0.3 * (dist / tolerance)
    } else {
      // Fora do corredor: penalidade proporcional ao desvio
      const excess = dist - tolerance
      const penaltyScore = Math.max(0, 0.7 - excess * 2.5)
      totalPrecisionWeight += penaltyScore
    }
  }

  return Math.min(1, Math.max(0, totalPrecisionWeight / allDrawnPoints.length))
}

/**
 * Calcula o engajamento baseado na fluidez do traçado e tempo de atividade.
 */
export function calculateEngagement(
  strokes: TracingStroke[],
  elapsedMs: number,
  totalSampleCount: number,
): number {
  let totalPoints = 0
  for (let s = 0; s < strokes.length; s++) {
    totalPoints += strokes[s].points.length
  }

  if (totalPoints === 0 || elapsedMs <= 0) {
    return 0
  }

  // Pontos suficientes com tempo adequado geram engajamento saudável
  const expectedPoints = Math.max(10, totalSampleCount * 0.8)
  const densityRatio = Math.min(1, totalPoints / expectedPoints)

  // Evita estagnação temporal extrema
  const durationSec = elapsedMs / 1000
  const temporalFactor = durationSec > 0.1 && durationSec < 60 ? 1 : 0.8

  return Math.min(1, Math.max(0, densityRatio * temporalFactor))
}

/**
 * Calcula a pontuação completa e atualizada do traçado.
 * A pontuação pode subir (conforme cobre mais a letra com precisão) ou descer (ao desviar ou rabiscar fora).
 */
export function calculateLiveScore(
  strokes: TracingStroke[],
  glyph: GlyphGeometry,
  elapsedMs: number,
): TracingScore {
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

  const { coverage, totalSampleCount } = calculateCoverage(strokes, glyph)
  const precision = calculatePrecision(strokes, glyph)
  const engagement = calculateEngagement(strokes, elapsedMs, totalSampleCount)

  // Cobertura é o fator principal (60%), precisão garante qualidade motora (30%), engajamento avalia fluidez (10%)
  const rawOverall = coverage * 0.6 + precision * 0.3 + engagement * 0.1
  const overall = Math.min(1, Math.max(0, Math.round(rawOverall * 1000) / 1000))

  return {
    coverage: Math.round(coverage * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    engagement: Math.round(engagement * 1000) / 1000,
    overall,
  }
}
