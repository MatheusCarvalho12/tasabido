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

// Previne ReferenceError: window is not defined quando timers assíncronos do @react-input/core
// disparam no event loop do Node após o teardown do ambiente jsdom.
const globalTarget = typeof global !== 'undefined' ? global : globalThis
if (typeof (globalTarget as unknown as { window?: unknown }).window === 'undefined') {
  ;(globalTarget as unknown as { window?: unknown }).window = globalTarget
}
