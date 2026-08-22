/**
 * Geometrias canônicas e amostragem para letras maiúsculas e acentos em português do Brasil.
 * Coordenadas normalizadas [0, 1] e viewBox padrão 0 0 100 100.
 */

import type { GlyphGeometry, GlyphStrokeGeometry, Point } from './types'

export class UnsupportedGlyphError extends Error {
  readonly character: string

  constructor(character: string) {
    super(`Caractere não suportado para traçado: "${character}"`)
    this.name = 'UnsupportedGlyphError'
    this.character = character
  }
}

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

/** Calcula o comprimento acumulado de uma lista de pontos. */
export function calculatePolylineLength(points: Point[]): number {
  let len = 0
  for (let i = 0; i < points.length - 1; i++) {
    len += distance(points[i], points[i + 1])
  }
  return len
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
  const length = calculatePolylineLength(normalizedPoints)

  return {
    id,
    pathData: pathParts.join(' '),
    samplePoints,
    length,
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
  const length = calculatePolylineLength(samplePoints)

  return {
    id,
    pathData,
    samplePoints,
    length,
    startPoint: samplePoints[0],
    endPoint: samplePoints[samplePoints.length - 1],
    order,
  }
}

/** Calcula o comprimento total de todos os traços de um glifo. */
function computeTotalLength(strokes: GlyphStrokeGeometry[]): number {
  return strokes.reduce((acc, s) => acc + s.length, 0)
}

function createGlyph(
  id: string,
  character: string,
  label: string,
  strokes: GlyphStrokeGeometry[],
  toleranceRadius = 0.12,
  completionThreshold = 0.7,
): GlyphGeometry {
  return {
    id,
    character,
    label,
    viewBox: '0 0 100 100',
    toleranceRadius,
    completionThreshold,
    strokes,
    totalTargetLength: computeTotalLength(strokes),
  }
}

// --------------------------------------------------------------------------
// Catálogo Imutável de Geometrias Canônicas (A-Z, Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç, Ü)
// --------------------------------------------------------------------------

export const IMMUTABLE_GLYPH_CATALOG_KEYS: string[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'Á',
  'À',
  'Â',
  'Ã',
  'É',
  'Ê',
  'Í',
  'Ó',
  'Ô',
  'Õ',
  'Ú',
  'Ç',
  'Ü',
]

const CANONICAL_GLYPHS: Record<string, GlyphGeometry> = {
  A: createGlyph('A', 'A', 'Letra A', [
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
  ]),
  B: createGlyph('B', 'B', 'Letra B', [
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
  ]),
  C: createGlyph('C', 'C', 'Letra C', [
    createArcStroke('c_arc', 50, 50, 35, 35, -45, -315, 'M 75 25 C 25 10, 15 90, 75 75', 28, 1),
  ]),
  D: createGlyph('D', 'D', 'Letra D', [
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
  ]),
  E: createGlyph('E', 'E', 'Letra E', [
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
  ]),
  F: createGlyph('F', 'F', 'Letra F', [
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
  ]),
  G: createGlyph('G', 'G', 'Letra G', [
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
  ]),
  H: createGlyph('H', 'H', 'Letra H', [
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
  ]),
  I: createGlyph('I', 'I', 'Letra I', [
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
  ]),
  J: createGlyph('J', 'J', 'Letra J', [
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
    createArcStroke('j_hook', 42.5, 65, 17.5, 17.5, 0, 180, 'M 60 65 C 60 85, 25 85, 25 65', 14, 3),
  ]),
  K: createGlyph('K', 'K', 'Letra K', [
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
  ]),
  L: createGlyph('L', 'L', 'Letra L', [
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
  ]),
  M: createGlyph('M', 'M', 'Letra M', [
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
  ]),
  N: createGlyph('N', 'N', 'Letra N', [
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
  ]),
  O: createGlyph('O', 'O', 'Letra O', [
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
  ]),
  P: createGlyph('P', 'P', 'Letra P', [
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
  ]),
  Q: createGlyph('Q', 'Q', 'Letra Q', [
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
  ]),
  R: createGlyph('R', 'R', 'Letra R', [
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
  ]),
  S: createGlyph('S', 'S', 'Letra S', [
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
  ]),
  T: createGlyph('T', 'T', 'Letra T', [
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
  ]),
  U: createGlyph('U', 'U', 'Letra U', [
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
  ]),
  V: createGlyph('V', 'V', 'Letra V', [
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
  ]),
  W: createGlyph('W', 'W', 'Letra W', [
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
  ]),
  X: createGlyph('X', 'X', 'Letra X', [
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
  ]),
  Y: createGlyph('Y', 'Y', 'Letra Y', [
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
  ]),
  Z: createGlyph('Z', 'Z', 'Letra Z', [
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
  ]),
}

// --------------------------------------------------------------------------
// Letras com Acentos do Português Brasileiro (Á, À, Â, Ã, É, Ê, Í, Ó, Ô, Õ, Ú, Ç, Ü)
// --------------------------------------------------------------------------

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
const diaeresisLeft = createPolylineStroke(
  'accent_diaeresis_l',
  [
    [38, 4],
    [38, 0],
  ],
  4,
  10,
)
const diaeresisRight = createPolylineStroke(
  'accent_diaeresis_r',
  [
    [62, 4],
    [62, 0],
  ],
  4,
  11,
)

CANONICAL_GLYPHS.Á = createGlyph('Á', 'Á', 'Letra Á', [...CANONICAL_GLYPHS.A.strokes, acuteAccent])
CANONICAL_GLYPHS.À = createGlyph('À', 'À', 'Letra À', [...CANONICAL_GLYPHS.A.strokes, graveAccent])
CANONICAL_GLYPHS.Â = createGlyph('Â', 'Â', 'Letra Â', [
  ...CANONICAL_GLYPHS.A.strokes,
  circumflexAccent,
])
CANONICAL_GLYPHS.Ã = createGlyph('Ã', 'Ã', 'Letra Ã', [...CANONICAL_GLYPHS.A.strokes, tildeAccent])
CANONICAL_GLYPHS.É = createGlyph('É', 'É', 'Letra É', [...CANONICAL_GLYPHS.E.strokes, acuteAccent])
CANONICAL_GLYPHS.Ê = createGlyph('Ê', 'Ê', 'Letra Ê', [
  ...CANONICAL_GLYPHS.E.strokes,
  circumflexAccent,
])
CANONICAL_GLYPHS.Í = createGlyph('Í', 'Í', 'Letra Í', [...CANONICAL_GLYPHS.I.strokes, acuteAccent])
CANONICAL_GLYPHS.Ó = createGlyph('Ó', 'Ó', 'Letra Ó', [...CANONICAL_GLYPHS.O.strokes, acuteAccent])
CANONICAL_GLYPHS.Ô = createGlyph('Ô', 'Ô', 'Letra Ô', [
  ...CANONICAL_GLYPHS.O.strokes,
  circumflexAccent,
])
CANONICAL_GLYPHS.Õ = createGlyph('Õ', 'Õ', 'Letra Õ', [...CANONICAL_GLYPHS.O.strokes, tildeAccent])
CANONICAL_GLYPHS.Ú = createGlyph('Ú', 'Ú', 'Letra Ú', [...CANONICAL_GLYPHS.U.strokes, acuteAccent])
CANONICAL_GLYPHS.Ç = createGlyph('Ç', 'Ç', 'Letra Ç', [...CANONICAL_GLYPHS.C.strokes, cedillaMark])
CANONICAL_GLYPHS.Ü = createGlyph('Ü', 'Ü', 'Letra Ü', [
  ...CANONICAL_GLYPHS.U.strokes,
  diaeresisLeft,
  diaeresisRight,
])

/**
 * Verifica se um caractere é suportado no catálogo canônico imutável.
 */
export function isGlyphSupported(character: string): boolean {
  if (!character || typeof character !== 'string') return false
  const normalized = character.normalize('NFC').toUpperCase().trim()
  return Object.hasOwn(CANONICAL_GLYPHS, normalized)
}

/**
 * Retorna a definição canônica de geometria para um caractere.
 * Lança UnsupportedGlyphError se o caractere não existir no catálogo.
 * NUNCA inventa retângulos ou substitutos fictícios.
 */
export function getGlyphGeometry(character: string): GlyphGeometry {
  if (!character || typeof character !== 'string') {
    throw new UnsupportedGlyphError(String(character))
  }
  const upper = character.normalize('NFC').toUpperCase().trim()
  const geom = CANONICAL_GLYPHS[upper]
  if (!geom) {
    throw new UnsupportedGlyphError(upper)
  }
  return geom
}

/**
 * Normaliza o primeiro nome da criança preservando a sequência completa de caracteres em Unicode NFC + uppercase.
 * NUNCA filtra silenciosamente nem remove caracteres não suportados.
 */
export function normalizeChildFirstName(fullName: string | null | undefined): string[] {
  if (!fullName || typeof fullName !== 'string') {
    return []
  }

  const trimmed = fullName.trim()
  if (!trimmed) {
    return []
  }

  const firstName = trimmed.split(/\s+/)[0] ?? ''
  const normalized = firstName.normalize('NFC').toUpperCase()
  return Array.from(normalized)
}

/**
 * Valida se todos os glifos da sequência estão presentes no catálogo imutável.
 */
export function validateGlyphSequence(chars: string[]): {
  isValid: boolean
  unsupported: string[]
} {
  const unsupported: string[] = []
  for (const char of chars) {
    if (!isGlyphSupported(char)) {
      unsupported.push(char)
    }
  }
  return {
    isValid: unsupported.length === 0,
    unsupported,
  }
}

/**
 * Constrói a geometria de traçado diretamente a partir das coordenadas normalizadas retornadas pelo backend.
 * Garante paridade exata de geometria com o servidor, eliminando dependência de formas duplicadas estáticas locais.
 */
export function createGlyphGeometryFromServer(
  character: string,
  rawStrokes: number[][][],
  toleranceRadius = 0.085,
  completionThreshold = 0.7,
): GlyphGeometry {
  if (!rawStrokes || !Array.isArray(rawStrokes) || rawStrokes.length === 0) {
    throw new UnsupportedGlyphError(character)
  }

  const strokes: GlyphStrokeGeometry[] = rawStrokes.map((rawPoints, strokeIdx) => {
    if (!rawPoints || rawPoints.length === 0) {
      throw new UnsupportedGlyphError(character)
    }

    const points: Point[] = rawPoints.map(([x, y]) => ({ x: Number(x), y: Number(y) }))
    const pathData = `M ${points.map((p) => `${p.x * 100} ${p.y * 100}`).join(' L ')}`

    const samplePoints: Point[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      if (p1 && p2) {
        const segSamples = sampleSegment(p1, p2, 10)
        samplePoints.push(...segSamples)
      }
    }
    if (points.length === 1 && points[0]) {
      samplePoints.push(points[0])
    }

    const length = calculatePolylineLength(points)
    const firstPoint = points[0] ?? { x: 0, y: 0 }
    const lastPoint = points[points.length - 1] ?? firstPoint

    return {
      id: `stroke_${character}_${strokeIdx + 1}`,
      pathData,
      samplePoints,
      length,
      startPoint: firstPoint,
      endPoint: lastPoint,
      order: strokeIdx + 1,
    }
  })

  const totalTargetLength = strokes.reduce((acc, s) => acc + s.length, 0)

  return {
    id: `glyph_${character}`,
    character,
    label: `Letra ${character}`,
    viewBox: '0 0 100 100',
    toleranceRadius,
    strokes,
    totalTargetLength,
    completionThreshold,
  }
}

/**
 * Converte um dicionário de geometrias retornado pela API do backend em geometrias renderizáveis.
 */
export function buildGlyphSetGeometries(
  geometryMap: Record<string, number[][][]>,
  toleranceRadius = 0.085,
): Record<string, GlyphGeometry> {
  const result: Record<string, GlyphGeometry> = {}
  for (const [char, strokes] of Object.entries(geometryMap)) {
    result[char] = createGlyphGeometryFromServer(char, strokes, toleranceRadius)
  }
  return result
}
