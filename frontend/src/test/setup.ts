import '@testing-library/jest-dom/vitest'

// jsdom não implementa matchMedia — o Motion (prefers-reduced-motion) e
// qualquer hook de media query quebram sem ele. Stub neutro: sem preferência.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

// jsdom implementa scrollTo como um "Not implemented" que lança erro —
// o TanStack Router chama a cada navegação (scroll restoration). Stub no-op.
window.scrollTo = (() => {}) as typeof window.scrollTo
