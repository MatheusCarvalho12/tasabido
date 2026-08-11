/**
 * Lock de orientação do modo criança.
 *
 * O modo criança é HORIZONTAL (tela de jogos); o PIN dos pais é VERTICAL.
 * `screen.orientation.lock` só funciona em app instalado (PWA standalone) —
 * fora disso cai no no-op silencioso e o CSS (min-h-dvh) garante usabilidade.
 * Sempre silencioso: nunca quebra o fluxo por falta de suporte do navegador.
 */

export async function lockPortrait(): Promise<void> {
  try {
    await screen.orientation?.lock('portrait')
  } catch {
    // Sem suporte (ex.: Safari iOS, desktop): segue no CSS.
  }
}

export async function lockLandscape(): Promise<void> {
  try {
    await screen.orientation?.lock('landscape')
  } catch {
    // Sem suporte: segue no CSS.
  }
}

export function unlockOrientation(): void {
  try {
    screen.orientation?.unlock()
  } catch {
    // No-op.
  }
}
