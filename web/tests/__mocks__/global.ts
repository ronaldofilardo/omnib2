/**
 * Mocks globais aplicados antes de qualquer importação
 * Este arquivo é carregado primeiro para garantir que os mocks sejam estabelecidos
 * antes de qualquer módulo ser importado nos testes
 */
import { vi } from 'vitest'

// =============================================================================
// CONFIGURAÇÃO DE MOCK GLOBAL - APLICADA ANTES DE QUALQUER IMPORTAÇÃO
// =============================================================================

// Mock do Prisma Client - Deve ser o primeiro mock a ser definido
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  healthEvent: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  professional: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  files: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  verificationToken: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn((callback) => callback(mockPrisma)),
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
}

// Mock do módulo Prisma ANTES de qualquer importação
vi.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

// Mock do Next.js Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock do Next Auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock fetch global
global.fetch = vi.fn()

// Mock de APIs do browser
global.alert = vi.fn()
global.confirm = vi.fn(() => true)
global.prompt = vi.fn()

// Mock para ResizeObserver (necessário para alguns componentes)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock para IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock para scrollIntoView (usado por Radix UI)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

// Mock para console em testes (evita poluição de logs)
if (process.env.NODE_ENV === 'test') {
  // Manter console.error para debugging, mas silenciar warnings desnecessários
  const originalConsoleWarn = console.warn
  console.warn = vi.fn((message, ...args) => {
    // Só mostrar warnings importantes
    if (message && typeof message === 'string' && 
        !message.includes('act()') && 
        !message.includes('ReactDOMTestUtils')) {
      originalConsoleWarn(message, ...args)
    }
  })
}

// Exportar mockPrisma para uso nos testes
export { mockPrisma }

// Função para resetar todos os mocks
export const resetAllMocks = () => {
  vi.clearAllMocks()
  // Resetar especificamente o mockPrisma
  Object.values(mockPrisma).forEach((mockTable: any) => {
    if (typeof mockTable === 'object' && mockTable !== null) {
      Object.values(mockTable).forEach((mockMethod: any) => {
        if (typeof mockMethod?.mockReset === 'function') {
          mockMethod.mockReset()
        }
      })
    }
  })
}

// Configurar limpeza automática após cada teste
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    resetAllMocks()
  })
}