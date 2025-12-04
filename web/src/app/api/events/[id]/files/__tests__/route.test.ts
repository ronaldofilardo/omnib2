import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { NextRequest } from 'next/server'

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
        update: vi.fn(),
      },
      files: {
        deleteMany: vi.fn(),
      },
    },
  };
});

// Mock do fs
vi.mock('fs/promises', () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/events/[id]/files - DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest
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
    files: [
      {
        id: 'file-1',
        slot: 'test-slot',
        url: '/uploads/event-1/file.pdf',
        uploadDate: new Date().toISOString(),
        expiryDate: null,
      },
    ],
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const req = createMockRequest({ slot: 'test-slot' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'event-1' }) })
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

      const req = createMockRequest({ slot: 'test-slot' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Evento não encontrado')
    })

    it('should return 403 if user does not own the event', async () => {
      const otherUserEvent = { ...mockEvent, userId: 'other-user' }
      mockPrisma.healthEvent.findUnique.mockResolvedValue(otherUserEvent)

      const req = createMockRequest({ slot: 'test-slot' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'event-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado: você não tem permissão para modificar este evento')
    })

    it('should return 404 if file slot does not exist', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)

      const req = createMockRequest({ slot: 'nonexistent-slot' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'event-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado')
    })

    it('should successfully delete file if user owns event and file exists', async () => {
      mockPrisma.healthEvent.findUnique.mockResolvedValue(mockEvent)
      mockPrisma.healthEvent.update.mockResolvedValue({})

      const req = createMockRequest({ slot: 'test-slot' })
      const response = await DELETE(req, { params: Promise.resolve({ id: 'event-1' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockPrisma.healthEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          files: {
            deleteMany: { slot: 'test-slot' }
          }
        }
      })
    })
  })
})