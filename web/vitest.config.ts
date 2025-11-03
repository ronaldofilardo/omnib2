// vitest.config.ts - Configuração unificada do Vitest
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks', // Usar forks para melhor controle de memória
    maxWorkers: 1, // Limitar a 1 worker
    setupFiles: [
      './tests/setupJestDom.ts', // Setup dedicado para jest-dom (matchers)
      './tests/setup.ts', // Setup global unificado para testes
      // './tests/utils/mocks/setupFetchMock.ts', // Desabilitado - deve ser importado explicitamente nos testes que precisam
    ],
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'tests/e2e/**', // Exclui testes E2E do Vitest
      'tests/results/**', // Exclui resultados de teste
    ],
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/test/', // Diretório antigo de testes
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
})
