import '@testing-library/jest-dom/vitest';
// Mock do useRouter do next/navigation para testes unitários
import { vi } from 'vitest';
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    // Adicione outros métodos se necessário
  }),
}));
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// Removido import duplicado de jest-dom - já é configurado em setupJestDom.ts

// Mock global para scrollIntoView (Radix UI Select)
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = function () {};
}

// Suprimir warnings do Radix UI (Dialog/Select) para não poluir o output dos testes
const originalConsoleError = console.error;
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args[0];
    if (
      typeof msg === 'string' &&
      (msg.includes('DialogContent') || msg.includes('aria-describedby') || msg.includes('DialogTitle'))
    ) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
});

afterEach(() => {
  cleanup();
});
