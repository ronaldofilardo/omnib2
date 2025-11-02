import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do lib/prisma.ts antes de importar a rota
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    healthEvent: {
      findMany: vi.fn(),
    },
  },
}))

// Importar a rota e o prisma mockado depois do mock
import { GET } from '../../../src/app/api/repository/route'
import { prisma } from '@/lib/prisma'

// Criar referência tipada para o mock
const mockPrisma = prisma as any

describe('/api/repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return events with files for userId in query', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Consulta Médica',
          date: '2025-01-15',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'exame.pdf', url: '/uploads/exame.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
        {
          id: 'event-2',
          title: 'Exame Laboratorial',
          date: '2025-01-20',
          type: 'EXAME',
          files: [
            {
              slot: 'certificate',
              name: 'atestado.pdf',
              url: '/uploads/atestado.pdf',
            },
          ],
          professional: {
            id: 'prof-2',
            name: 'Dra. Santos',
            specialty: 'Clínica Geral',
          },
        },
      ]

      mockPrisma.healthEvent.findMany.mockResolvedValue(mockEvents)

      const req = { url: 'http://localhost/api/repository?userId=user-1' } as Request
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockEvents)
      expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
        },
        include: {
          professional: true,
        },
        orderBy: {
          date: 'desc',
        },
      })
    })

    it('should return empty array when no events with files exist', async () => {
      const mockEvents: any[] = []
      mockPrisma.healthEvent.findMany.mockResolvedValue(mockEvents)
      const req = { url: 'http://localhost/api/repository?userId=user-1' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 400 if userId is missing', async () => {
      const req = { url: 'http://localhost/api/repository' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBe('userId é obrigatório')
    })

    it('should return 500 on database error during events lookup', async () => {
      mockPrisma.healthEvent.findMany.mockRejectedValue(new Error('Database error'))
      const req = { url: 'http://localhost/api/repository?userId=user-1' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno ao buscar dados do repositório.')
    })

    it('should return 500 on database error during events lookup', async () => {
      const mockUser = { id: 'user-1' }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.healthEvent.findMany.mockRejectedValue(
        new Error('Database error')
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Erro interno ao buscar dados do repositório.')
    })

    it('should filter out events with empty files array', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Consulta Médica',
          date: '2025-01-15',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'exame.pdf', url: '/uploads/exame.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
      ]
      mockPrisma.healthEvent.findMany.mockResolvedValue([mockEvents[0]])
      const req = { url: 'http://localhost/api/repository?userId=user-1' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('event-1')
    })

    it('should order events by date descending', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Evento Antigo',
          date: '2025-01-10',
          type: 'CONSULTA',
          files: [
            { slot: 'result', name: 'file.pdf', url: '/uploads/file.pdf' },
          ],
          professional: {
            id: 'prof-1',
            name: 'Dr. Silva',
            specialty: 'Cardiologia',
          },
        },
        {
          id: 'event-2',
          title: 'Evento Novo',
          date: '2025-01-20',
          type: 'EXAME',
          files: [
            { slot: 'certificate', name: 'cert.pdf', url: '/uploads/cert.pdf' },
          ],
          professional: {
            id: 'prof-2',
            name: 'Dra. Santos',
            specialty: 'Clínica Geral',
          },
        },
      ]
      mockPrisma.healthEvent.findMany.mockResolvedValue([
        mockEvents[1],
        mockEvents[0],
      ])
      const req = { url: 'http://localhost/api/repository?userId=user-1' } as Request
      const response = await GET(req)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].date).toBe('2025-01-20') // Most recent first
      expect(data[1].date).toBe('2025-01-10')
    })
  })
})
