/**
 * Geometrias canônicas e amostragem para letras maiúsculas e acentos em português do Brasil.
 * Coordenadas normalizadas [0, 1] e viewBox padrão 0 0 100 100.
 */

import type { GlyphGeometry, GlyphStrokeGeometry, Point } from './types'

/** Distância euclidiana ao quadrado entre dois pontos. */
export function distanceSquared(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return dx * dx + dy * dy
}

/** Distância euclidiana entre dois pontos. */
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(distanceSquared(p1, p2))
}

/** Distância euclidiana mínima de um ponto a um conjunto de pontos amostrados. */
export function minDistanceToSamples(point: Point, samplePoints: Point[]): number {
  if (samplePoints.length === 0) return 1
  let minD2 = Number.POSITIVE_INFINITY
  for (let i = 0; i < samplePoints.length; i++) {
    const d2 = distanceSquared(point, samplePoints[i])
    if (d2 < minD2) {
      minD2 = d2
    }
  }
  return Math.sqrt(minD2)
}

/** Amostra pontos ao longo de um segmento linear entre p1 e p2. */
export function sampleSegment(p1: Point, p2: Point, count: number): Point[] {
  const points: Point[] = []
  const steps = Math.max(1, count)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    })
  }
  return points
}

/** Amostra pontos ao longo de um arco elíptico. */
export function sampleArc(
  centerX: number,
  centerY: number,
  rx: number,
  ry: number,
  startAngleDeg: number,
  endAngleDeg: number,
  count: number,
): Point[] {
  const points: Point[] = []
  const steps = Math.max(1, count)
  const startRad = (startAngleDeg * Math.PI) / 180
  const endRad = (endAngleDeg * Math.PI) / 180

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = startRad + (endRad - startRad) * t
    points.push({
      x: centerX + rx * Math.cos(angle),
      y: centerY + ry * Math.sin(angle),
    })
  }
  return points
}

/** Cria um traço a partir de polilinha em coordenadas de 0 a 100. */
function createPolylineStroke(
  id: string,
  rawPoints: Array<[number, number]>,
  samplesPerSegment = 10,
  order = 1,
): GlyphStrokeGeometry {
  const normalizedPoints: Point[] = rawPoints.map(([x, y]) => ({
    x: x / 100,
    y: y / 100,
  }))

  const samplePoints: Point[] = []
  for (let i = 0; i < normalizedPoints.length - 1; i++) {
    const seg = sampleSegment(normalizedPoints[i], normalizedPoints[i + 1], samplesPerSegment)
    if (i > 0) seg.shift() // evita ponto duplicado na junção
    samplePoints.push(...seg)
  }

  const pathParts = rawPoints.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'} ${x} ${y}`)

  return {
    id,
    pathData: pathParts.join(' '),
    samplePoints,
    startPoint: normalizedPoints[0],
    endPoint: normalizedPoints[normalizedPoints.length - 1],
    order,
  }
}

/** Cria um traço curvo em arco. */
function createArcStroke(
  id: string,
  centerX: number,
  centerY: number,
  rx: number,
  ry: number,
  startDeg: number,
  endDeg: number,
  pathData: string,
  samples = 20,
  order = 1,
): GlyphStrokeGeometry {
  const samplePoints = sampleArc(
    centerX / 100,
    centerY / 100,
    rx / 100,
    ry / 100,
    startDeg,
    endDeg,
    samples,
  )
  return {
    id,
    pathData,
    samplePoints,
    startPoint: samplePoints[0],
    endPoint: samplePoints[samplePoints.length - 1],
    order,
  }
}

// --------------------------------------------------------------------------
// Dicionário de Geometrias Canônicas para Letras Maiúsculas e Acentos
// --------------------------------------------------------------------------

const CANONICAL_GLYPHS: Record<string, GlyphGeometry> = {
  A: {
    id: 'A',
    character: 'A',
    label: 'Letra A',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'a_left',
        [
          [50, 15],
          [20, 85],
        ],
        14,
        1,
      ),
      createPolylineStroke(
        'a_right',
        [
          [50, 15],
          [80, 85],
        ],
        14,
        2,
      ),
      createPolylineStroke(
        'a_cross',
        [
          [32, 58],
          [68, 58],
        ],
        10,
        3,
      ),
    ],
  },
  B: {
    id: 'B',
    character: 'B',
    label: 'Letra B',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'b_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createArcStroke('b_top', 25, 32.5, 35, 17.5, -90, 90, 'M 25 15 C 60 15, 60 50, 25 50', 16, 2),
      createArcStroke('b_bot', 25, 67.5, 40, 17.5, -90, 90, 'M 25 50 C 65 50, 65 85, 25 85', 16, 3),
    ],
  },
  C: {
    id: 'C',
    character: 'C',
    label: 'Letra C',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createArcStroke('c_arc', 50, 50, 35, 35, -45, -315, 'M 75 25 C 25 10, 15 90, 75 75', 28, 1),
    ],
  },
  D: {
    id: 'D',
    character: 'D',
    label: 'Letra D',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'd_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createArcStroke('d_arc', 25, 50, 55, 35, -90, 90, 'M 25 15 C 80 15, 80 85, 25 85', 24, 2),
    ],
  },
  E: {
    id: 'E',
    character: 'E',
    label: 'Letra E',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'e_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createPolylineStroke(
        'e_top',
        [
          [25, 15],
          [75, 15],
        ],
        10,
        2,
      ),
      createPolylineStroke(
        'e_mid',
        [
          [25, 50],
          [65, 50],
        ],
        10,
        3,
      ),
      createPolylineStroke(
        'e_bot',
        [
          [25, 85],
          [75, 85],
        ],
        10,
        4,
      ),
    ],
  },
  F: {
    id: 'F',
    character: 'F',
    label: 'Letra F',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'f_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createPolylineStroke(
        'f_top',
        [
          [25, 15],
          [75, 15],
        ],
        12,
        2,
      ),
      createPolylineStroke(
        'f_mid',
        [
          [25, 50],
          [65, 50],
        ],
        10,
        3,
      ),
    ],
  },
  G: {
    id: 'G',
    character: 'G',
    label: 'Letra G',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createArcStroke('g_arc', 50, 50, 35, 35, -45, -270, 'M 75 25 C 20 10, 15 90, 75 85', 26, 1),
      createPolylineStroke(
        'g_bar',
        [
          [75, 85],
          [75, 55],
          [52, 55],
        ],
        12,
        2,
      ),
    ],
  },
  H: {
    id: 'H',
    character: 'H',
    label: 'Letra H',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'h_left',
        [
          [25, 15],
          [25, 85],
        ],
        14,
        1,
      ),
      createPolylineStroke(
        'h_right',
        [
          [75, 15],
          [75, 85],
        ],
        14,
        2,
      ),
      createPolylineStroke(
        'h_mid',
        [
          [25, 50],
          [75, 50],
        ],
        10,
        3,
      ),
    ],
  },
  I: {
    id: 'I',
    character: 'I',
    label: 'Letra I',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'i_stem',
        [
          [50, 15],
          [50, 85],
        ],
        18,
        1,
      ),
      createPolylineStroke(
        'i_top',
        [
          [30, 15],
          [70, 15],
        ],
        10,
        2,
      ),
      createPolylineStroke(
        'i_bot',
        [
          [30, 85],
          [70, 85],
        ],
        10,
        3,
      ),
    ],
  },
  J: {
    id: 'J',
    character: 'J',
    label: 'Letra J',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'j_top',
        [
          [35, 15],
          [75, 15],
        ],
        10,
        1,
      ),
      createPolylineStroke(
        'j_stem',
        [
          [60, 15],
          [60, 65],
        ],
        12,
        2,
      ),
      createArcStroke(
        'j_hook',
        42.5,
        65,
        17.5,
        17.5,
        0,
        180,
        'M 60 65 C 60 85, 25 85, 25 65',
        14,
        3,
      ),
    ],
  },
  K: {
    id: 'K',
    character: 'K',
    label: 'Letra K',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'k_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createPolylineStroke(
        'k_diag_up',
        [
          [75, 15],
          [25, 50],
        ],
        12,
        2,
      ),
      createPolylineStroke(
        'k_diag_down',
        [
          [25, 50],
          [75, 85],
        ],
        12,
        3,
      ),
    ],
  },
  L: {
    id: 'L',
    character: 'L',
    label: 'Letra L',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'l_path',
        [
          [25, 15],
          [25, 85],
          [75, 85],
        ],
        22,
        1,
      ),
    ],
  },
  M: {
    id: 'M',
    character: 'M',
    label: 'Letra M',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'm_path',
        [
          [20, 85],
          [20, 15],
          [50, 60],
          [80, 15],
          [80, 85],
        ],
        32,
        1,
      ),
    ],
  },
  N: {
    id: 'N',
    character: 'N',
    label: 'Letra N',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'n_path',
        [
          [25, 85],
          [25, 15],
          [75, 85],
          [75, 15],
        ],
        28,
        1,
      ),
    ],
  },
  O: {
    id: 'O',
    character: 'O',
    label: 'Letra O',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createArcStroke(
        'o_arc',
        50,
        50,
        35,
        35,
        -90,
        270,
        'M 50 15 C 90 15, 90 85, 50 85 C 10 85, 10 15, 50 15',
        36,
        1,
      ),
    ],
  },
  P: {
    id: 'P',
    character: 'P',
    label: 'Letra P',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'p_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createArcStroke('p_loop', 25, 35, 40, 20, -90, 90, 'M 25 15 C 65 15, 65 55, 25 55', 18, 2),
    ],
  },
  Q: {
    id: 'Q',
    character: 'Q',
    label: 'Letra Q',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createArcStroke(
        'q_arc',
        50,
        45,
        35,
        33,
        -90,
        270,
        'M 50 12 C 90 12, 90 78, 50 78 C 10 78, 10 12, 50 12',
        32,
        1,
      ),
      createPolylineStroke(
        'q_tail',
        [
          [55, 65],
          [82, 90],
        ],
        8,
        2,
      ),
    ],
  },
  R: {
    id: 'R',
    character: 'R',
    label: 'Letra R',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'r_stem',
        [
          [25, 15],
          [25, 85],
        ],
        16,
        1,
      ),
      createArcStroke('r_loop', 25, 35, 40, 20, -90, 90, 'M 25 15 C 65 15, 65 55, 25 55', 18, 2),
      createPolylineStroke(
        'r_leg',
        [
          [45, 55],
          [75, 85],
        ],
        10,
        3,
      ),
    ],
  },
  S: {
    id: 'S',
    character: 'S',
    label: 'Letra S',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        's_curve',
        [
          [75, 25],
          [40, 15],
          [25, 35],
          [75, 65],
          [60, 85],
          [25, 75],
        ],
        26,
        1,
      ),
    ],
  },
  T: {
    id: 'T',
    character: 'T',
    label: 'Letra T',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        't_bar',
        [
          [20, 15],
          [80, 15],
        ],
        14,
        1,
      ),
      createPolylineStroke(
        't_stem',
        [
          [50, 15],
          [50, 85],
        ],
        16,
        2,
      ),
    ],
  },
  U: {
    id: 'U',
    character: 'U',
    label: 'Letra U',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createArcStroke(
        'u_path',
        50,
        55,
        28,
        30,
        180,
        0,
        'M 22 15 L 22 55 C 22 85, 78 85, 78 55 L 78 15',
        26,
        1,
      ),
    ],
  },
  V: {
    id: 'V',
    character: 'V',
    label: 'Letra V',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'v_path',
        [
          [20, 15],
          [50, 85],
          [80, 15],
        ],
        24,
        1,
      ),
    ],
  },
  W: {
    id: 'W',
    character: 'W',
    label: 'Letra W',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'w_path',
        [
          [15, 15],
          [32, 85],
          [50, 35],
          [68, 85],
          [85, 15],
        ],
        32,
        1,
      ),
    ],
  },
  X: {
    id: 'X',
    character: 'X',
    label: 'Letra X',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'x_diag1',
        [
          [22, 15],
          [78, 85],
        ],
        16,
        1,
      ),
      createPolylineStroke(
        'x_diag2',
        [
          [78, 15],
          [22, 85],
        ],
        16,
        2,
      ),
    ],
  },
  Y: {
    id: 'Y',
    character: 'Y',
    label: 'Letra Y',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'y_v',
        [
          [20, 15],
          [50, 50],
          [80, 15],
        ],
        18,
        1,
      ),
      createPolylineStroke(
        'y_stem',
        [
          [50, 50],
          [50, 85],
        ],
        10,
        2,
      ),
    ],
  },
  Z: {
    id: 'Z',
    character: 'Z',
    label: 'Letra Z',
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'z_path',
        [
          [22, 15],
          [78, 15],
          [22, 85],
          [78, 85],
        ],
        26,
        1,
      ),
    ],
  },
}

// --------------------------------------------------------------------------
// Letras com Acentos do Português Brasileiro (Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç)
// --------------------------------------------------------------------------

// Acentos reutilizáveis
const acuteAccent = createPolylineStroke(
  'accent_acute',
  [
    [42, 6],
    [58, 0],
  ],
  6,
  10,
)
const graveAccent = createPolylineStroke(
  'accent_grave',
  [
    [58, 0],
    [42, 6],
  ],
  6,
  10,
)
const circumflexAccent = createPolylineStroke(
  'accent_circ',
  [
    [38, 7],
    [50, 0],
    [62, 7],
  ],
  8,
  10,
)
const tildeAccent = createPolylineStroke(
  'accent_tilde',
  [
    [36, 4],
    [44, 0],
    [56, 6],
    [64, 2],
  ],
  10,
  10,
)
const cedillaMark = createPolylineStroke(
  'accent_cedilla',
  [
    [50, 85],
    [50, 93],
    [44, 98],
    [56, 98],
  ],
  8,
  10,
)

CANONICAL_GLYPHS.Á = {
  id: 'Á',
  character: 'Á',
  label: 'Letra Á',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.A.strokes, acuteAccent],
}

CANONICAL_GLYPHS.À = {
  id: 'À',
  character: 'À',
  label: 'Letra À',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.A.strokes, graveAccent],
}

CANONICAL_GLYPHS.Â = {
  id: 'Â',
  character: 'Â',
  label: 'Letra Â',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.A.strokes, circumflexAccent],
}

CANONICAL_GLYPHS.Ã = {
  id: 'Ã',
  character: 'Ã',
  label: 'Letra Ã',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.A.strokes, tildeAccent],
}

CANONICAL_GLYPHS.É = {
  id: 'É',
  character: 'É',
  label: 'Letra É',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.E.strokes, acuteAccent],
}

CANONICAL_GLYPHS.Ê = {
  id: 'Ê',
  character: 'Ê',
  label: 'Letra Ê',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.E.strokes, circumflexAccent],
}

CANONICAL_GLYPHS.Í = {
  id: 'Í',
  character: 'Í',
  label: 'Letra Í',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.I.strokes, acuteAccent],
}

CANONICAL_GLYPHS.Ó = {
  id: 'Ó',
  character: 'Ó',
  label: 'Letra Ó',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.O.strokes, acuteAccent],
}

CANONICAL_GLYPHS.Ô = {
  id: 'Ô',
  character: 'Ô',
  label: 'Letra Ô',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.O.strokes, circumflexAccent],
}

CANONICAL_GLYPHS.Õ = {
  id: 'Õ',
  character: 'Õ',
  label: 'Letra Õ',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.O.strokes, tildeAccent],
}

CANONICAL_GLYPHS.Ú = {
  id: 'Ú',
  character: 'Ú',
  label: 'Letra Ú',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.U.strokes, acuteAccent],
}

CANONICAL_GLYPHS.Ç = {
  id: 'Ç',
  character: 'Ç',
  label: 'Letra Ç',
  viewBox: '0 0 100 100',
  toleranceRadius: 0.12,
  completionThreshold: 0.75,
  strokes: [...CANONICAL_GLYPHS.C.strokes, cedillaMark],
}

/**
 * Retorna a definição canônica de geometria para um caractere.
 * Suporta A-Z e acentos brasileiros (Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç).
 * Fornece fallback seguro caso um caractere desconhecido seja solicitado.
 */
export function getGlyphGeometry(character: string): GlyphGeometry {
  const upper = character.toUpperCase().trim()
  if (CANONICAL_GLYPHS[upper]) {
    return CANONICAL_GLYPHS[upper]
  }

  // Fallback seguro: cria uma letra padrão (retângulo/guia) se não estiver mapeada
  return {
    id: upper || 'UNKNOWN',
    character: upper || '?',
    label: `Letra ${upper || '?'}`,
    viewBox: '0 0 100 100',
    toleranceRadius: 0.12,
    completionThreshold: 0.75,
    strokes: [
      createPolylineStroke(
        'fallback_stroke',
        [
          [20, 20],
          [80, 20],
          [80, 80],
          [20, 80],
          [20, 20],
        ],
        24,
        1,
      ),
    ],
  }
}

/**
 * Normaliza o nome da criança para a sequência de glifos individuais:
 * - Pega o primeiro nome
 * - Converte para MAIÚSCULAS
 * - Mantém acentos válidos (Á, É, Í, Ó, Ú, Â, Ê, Ô, Ã, Õ, Ç, À)
 * - Remove caracteres numéricos ou pontuação inválida
 */
export function normalizeChildFirstName(fullName: string | null | undefined): string[] {
  if (!fullName || typeof fullName !== 'string') {
    return ['A', 'N', 'A']
  }

  const firstName = fullName.trim().split(/\s+/)[0] ?? ''
  const upper = firstName.toUpperCase()

  // Filtra apenas letras A-Z e acentos válidos em português
  const validChars = upper.split('').filter((ch) => /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]$/.test(ch))

  return validChars.length > 0 ? validChars : ['A', 'N', 'A']
}
