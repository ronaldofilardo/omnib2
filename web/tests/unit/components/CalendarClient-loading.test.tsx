import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarClient from '@/app/(receptor)/calendar/CalendarClient'

// Mock do router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock global do fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CalendarClient - Loading States e Error Handling', () => {
  const mockUserId = 'user-123'
  
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Consulta Cardiologia',
      date: '2025-01-15',
      type: 'CONSULTA',
      professionalId: 'prof-1',
      startTime: '09:00',
      endTime: '10:00',
    },
  ]

  const mockProfessionals = [
    {
      id: 'prof-1',
      name: 'Dr. João',
      specialty: 'Cardiologia',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('Loading States', () => {
    it('deve mostrar spinner de loading ao carregar', async () => {
      // Simular delay na resposta
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          }), 100)
        )
      )

      render(<CalendarClient userId={mockUserId} />)

      // Verificar spinner
      expect(screen.getByText('Carregando eventos...')).toBeInTheDocument()
      
      // Verificar que o spinner desaparece após carregamento
      await waitFor(() => {
        expect(screen.queryByText('Carregando eventos...')).not.toBeInTheDocument()
      })
    })

    it('deve exibir animação de spinner durante carregamento', () => {
      mockFetch.mockImplementation(() => 
        new Promise(() => {}) // Promise que nunca resolve (loading infinito)
      )

      render(<CalendarClient userId={mockUserId} />)

      const spinner = screen.getByText('Carregando eventos...').previousSibling
      expect(spinner).toHaveClass('animate-spin')
    })
  })

  describe('Error Handling', () => {
    it('deve exibir mensagem de erro quando falha ao buscar eventos', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.reject(new Error('Erro ao buscar eventos'))
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar dados')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
    })

    it('deve mostrar botão de retry após erro', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.reject(new Error('Network error'))
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve tentar recarregar ao clicar no botão retry', async () => {
      const user = userEvent.setup()

      // Primeira tentativa: erro
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.reject(new Error('Network error'))
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Segunda tentativa: sucesso
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ events: mockEvents }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockProfessionals,
        })
      })

      const retryButton = screen.getByText('Tentar novamente')
      await user.click(retryButton)

      await waitFor(() => {
        // Após retry bem-sucedido, não deve mais mostrar erro
        expect(screen.queryByText('Erro ao carregar dados')).not.toBeInTheDocument()
      })
    })

    it('deve exibir ícone de erro visual', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.reject(new Error('Test error'))
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve lidar com erro 404 no fetch', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' }),
          })
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('deve lidar com erro 500 no fetch', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProfessionals,
          })
        }
        if (url.includes('/api/events')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Server error' }),
          })
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar eventos/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Timeouts', () => {
    it('deve aplicar timeout de 10s para buscar profissionais', async () => {
      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        const professionalsCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/api/professionals')
        )
        expect(professionalsCall).toBeDefined()
        expect(professionalsCall![1]?.signal).toBeDefined()
      })
    })

    it('deve aplicar timeout de 15s para buscar eventos', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ events: mockEvents }),
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        const eventsCall = mockFetch.mock.calls.find(
          (call) => call[0].includes('/api/events')
        )
        expect(eventsCall).toBeDefined()
        expect(eventsCall![1]?.signal).toBeDefined()
      })
    })

    it('deve lidar com timeout expirado', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/professionals')) {
          return Promise.reject(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          )
        }
        if (url.includes('/api/events')) {
          return Promise.reject(
            Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
          )
        }
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        // Erro de timeout exibido (profissionais ou eventos)
        expect(screen.getByText('Erro ao carregar eventos: The operation was aborted')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Formato de Resposta', () => {
    it('deve lidar com resposta paginada (nova estrutura)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          events: mockEvents,
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        }),
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando eventos...')).not.toBeInTheDocument()
      })
    })

    it('deve lidar com resposta antiga (array direto)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockEvents, // Array direto (fallback)
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.queryByText('Carregando eventos...')).not.toBeInTheDocument()
      })
    })

    it('deve rejeitar formato de resposta inválido', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ invalidKey: 'invalidValue' }),
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(screen.getByText(/Formato de resposta inválido/)).toBeInTheDocument()
      })
    })
  })

  describe('Cache Control', () => {
    it('deve usar cache: no-store para requisições', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ events: mockEvents }),
      })

      render(<CalendarClient userId={mockUserId} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            cache: 'no-store',
          })
        )
      })
    })
  })

  describe('Proteção contra userId inválido', () => {
    it('não deve fazer fetch se userId não fornecido', () => {
      render(<CalendarClient userId="" />)

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
