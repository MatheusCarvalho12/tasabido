/**
 * Contrato do modo criança (tickets T2/T3 — backend ainda em construção).
 * O tipo Game/GameStats é único e vive em types/game.ts (compartilhado com o
 * preview modal da task T6); este arquivo reexporta e completa o envelope das
 * respostas de lista. NUNCA inventar dados: campos ausentes ficam ausentes.
 */

export type { Game, GameStats } from '@/types/game'

import type { Game } from '@/types/game'

/** Criança da família autenticada (GET /api/children). */
export interface Child {
  id: string
  name: string
}

/** Respostas de lista do backend seguem o envelope {items: [...]}. */
export interface GameListResponse {
  items: Game[]
}

export interface ChildrenListResponse {
  items: Child[]
}
