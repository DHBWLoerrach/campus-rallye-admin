import '@testing-library/jest-dom/vitest';

if (!('ResizeObserver' in globalThis)) {
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  (globalThis as typeof globalThis & {
    ResizeObserver: typeof ResizeObserver;
  }).ResizeObserver = ResizeObserver;
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
}
