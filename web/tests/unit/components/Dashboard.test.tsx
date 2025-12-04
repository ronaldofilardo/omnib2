import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Dashboard } from '../../../src/components/Dashboard'

// Mock do contexto
vi.mock('../../../src/contexts/EventsContext', () => ({
  EventsProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="events-provider">{children}</div>,
  useEvents: () => ({
    events: [],
    professionals: [],
    loading: false,
    error: null,
    deleteEventOptimistic: vi.fn(),
    refreshData: vi.fn(),
  }),
}))

// Mock de componentes
vi.mock('../../../src/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>
}))

vi.mock('../../../src/components/Timeline', () => ({
  Timeline: () => <div data-testid="timeline">Timeline</div>
}))

vi.mock('../../../src/components/NewEventModal', () => ({
  default: () => <div data-testid="new-event-modal">NewEventModal</div>
}))

vi.mock('../../../src/components/ShareModal', () => ({
  ShareModal: () => <div data-testid="share-modal">ShareModal</div>
}))

describe('Dashboard', () => {
  const mockProps = {
    onLogout: vi.fn(),
    userId: 'test-user',
    userRole: 'RECEPTOR' as const,
    user: { name: 'Test User' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar com EventsProvider', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByTestId('events-provider')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('new-event-modal')).toBeInTheDocument()
    expect(screen.getByText('Minha Timeline')).toBeInTheDocument()
  })

  it('deve mostrar timeline por padrão para RECEPTOR', () => {
    render(<Dashboard {...mockProps} />)

    expect(screen.getByText('Minha Timeline')).toBeInTheDocument()
  })

  it('deve mostrar portal de laudos para EMISSOR', () => {
    render(<Dashboard {...mockProps} userRole="EMISSOR" />)

    expect(screen.getByText((content) => content.includes('Portal de Envio'))).toBeInTheDocument()
  })

  it('deve mostrar data atual formatada', () => {
    render(<Dashboard {...mockProps} />)

    // Verificar se há texto com formato de data (ex: 18/11/2025 - terça-feira)
    const dateElements = screen.getAllByText((content, element) => {
      return /\d{1,2}\/\d{1,2}\/\d{4}\s-\s\w+/.test(content)
    })
    expect(dateElements.length).toBeGreaterThan(0)
  })
})
