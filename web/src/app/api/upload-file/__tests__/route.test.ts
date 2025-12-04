import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      healthEvent: {
        findUnique: vi.fn(),
      },
      files: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      adminMetrics: {
        upsert: vi.fn(),
      },
    },
  };
});

// Mock do fileHashServer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBuffer: vi.fn().mockReturnValue('mock-hash'),
}))

// Mock do fs
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-file-id'),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/upload-file - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (formData: FormData) => {
    return {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as Request
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'RECEPTOR',
  }

  const mockEvent = {
    id: 'event-1',
    userId: 'user-1',
    title: 'Test Event',
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Autenticação obrigatória')
    })
  })

  describe('Autorização', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should return 404 if event does not exist', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'nonexistent-event')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento não encontrado.')
    })

    it('should return 403 if user does not own the event', async () => {
      const otherUserEvent = { ...mockEvent, userId: 'other-user' }
      mockPrisma.healthEvent.findUnique.mockResolvedValue(otherUserEvent)

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado: você não tem permissão para fazer upload neste evento.')
    })

    it('should proceed with upload if user owns the event', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.files.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.files.create.mockResolvedValue({})
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test'], 'test.png', { type: 'image/png' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('name')
    })
  })

  describe('Validação de dados', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should return 400 if required fields are missing', async () => {
      const formData = new FormData()
      // Missing file, slot, and eventId

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Dados incompletos.')
    })

    it('should return 400 for non-image files', async () => {
      const formData = new FormData()
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)
      formData.append('slot', 'test-slot')
      formData.append('eventId', 'event-1')

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Apenas arquivos de imagem são aceitos (PNG, JPG, JPEG, GIF, etc.).')
    })
  })
})