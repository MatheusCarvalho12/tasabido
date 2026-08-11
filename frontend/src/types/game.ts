/**
 * Contrato do modo criança (tickets T2/T3 — backend ainda em construção).
 * Este é o contrato FIXO que o front consome; a integração real acontece na
 * task de integração (T8). NUNCA inventar dados: campos ausentes ficam
 * ausentes/zerados, nunca preenchidos com valores fictícios.
 */

export interface GameStats {
  /** Quantidade de partidas jogadas (count de game_runs). */
  partidas: number
  /** Tempo médio por partida, em minutos (arredondado). */
  tempo_medio_min: number
  /** Pontuação média, 0-100. */
  score_medio: number
}

export interface Game {
  id: number
  slug: string
  titulo: string
  descricao: string
  tutorial: string
  categoria: string
  visibilidade: 'public' | 'private'
  status: 'draft' | 'published'
  /** URL relativa (ex.: /api/games/1/svg) ou absoluta; null quando sem arte. */
  svg_url: string | null
  /** Paleta de cores do jogo (cores[0] vira o fundo da thumbnail). */
  cores: string[]
  stats: GameStats
  /** Presente apenas nos itens de GET /api/children/{child_id}/assignments. */
  atribuido_em?: string | null
}
