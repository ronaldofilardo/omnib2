import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock do fs/promises
var mockReadFile: any
var mockAccess: any
vi.mock('fs/promises', () => {
  mockReadFile = vi.fn()
  mockAccess = vi.fn()
  return {
    readFile: mockReadFile,
    access: mockAccess,
    default: {
      readFile: mockReadFile,
      access: mockAccess,
    }
  }
})

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    files: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    adminMetrics: {
      upsert: vi.fn(),
    },
  },
}))

// Mock do audit service
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn(),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logDocumentSubmission } from '@/lib/services/auditService'

const mockAuth = auth as any
const mockPrisma = prisma as any
const mockLogDocumentSubmission = logDocumentSubmission as any

describe('/api/files/[id]/download - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (fileId: string) => {
    return {
      headers: {
        get: vi.fn((key: string) => {
          if (key === 'x-forwarded-for') return '127.0.0.1'
          if (key === 'x-real-ip') return null
          if (key === 'user-agent') return 'TestAgent/1.0'
          return null
        }),
      },
    } as unknown as NextRequest
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    cpf: '12345678901',
    role: 'RECEPTOR' as const,
  }

  const mockFile = {
    id: 'file-1',
    name: 'test.pdf',
    url: '/api/files/file-1/download',
    physicalPath: '/uploads/event-1/test.pdf',
    fileHash: 'hash123',
    health_events: {
      id: 'event-1',
      userId: 'user-1',
      title: 'Consulta',
      type: 'CONSULTA',
    },
    professionals: null,
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Não autorizado')
    })
  })

  describe('Autorização', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should allow access for admin users', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' as const }
      mockAuth.mockResolvedValue(adminUser)

      mockPrisma.files.findUnique.mockResolvedValue(mockFile)
      mockPrisma.user.findUnique.mockResolvedValue({ cpf: '12345678901', name: 'Test User' })
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(Buffer.from('file content'))

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })

      expect(response.status).toBe(200)
      expect(mockLogDocumentSubmission).toHaveBeenCalledWith({
        origin: 'PORTAL_LOGADO',
        receiverCpf: '12345678901',
        patientId: 'user-1',
        patientName: 'Test User',
        fileName: 'test.pdf',
        fileHash: 'hash123',
        protocol: null,
        ip: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        status: 'SUCCESS',
      })
    })

    it('should allow access for file owner (event belongs to user)', async () => {
      mockPrisma.files.findUnique.mockResolvedValue(mockFile)
      mockPrisma.user.findUnique.mockResolvedValue({ cpf: '12345678901', name: 'Test User' })
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(Buffer.from('file content'))

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })

      expect(response.status).toBe(200)
    })

    it('should allow access for professional file owner', async () => {
      const fileWithProfessional = {
        ...mockFile,
        health_events: null,
        professionals: {
          id: 'prof-1',
          userId: 'user-1',
          name: 'Dr. Test',
        },
      }

      mockPrisma.files.findUnique.mockResolvedValue(fileWithProfessional)
      mockPrisma.user.findUnique.mockResolvedValue({ cpf: '12345678901', name: 'Test User' })
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(Buffer.from('file content'))

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })

      expect(response.status).toBe(200)
    })

    it('should deny access for non-owner users', async () => {
      const fileFromOtherUser = {
        ...mockFile,
        health_events: {
          ...mockFile.health_events,
          userId: 'other-user', // Different user
        },
      }

      mockPrisma.files.findUnique.mockResolvedValue(fileFromOtherUser)

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado ao arquivo')
    })

    it('should deny access for files without ownership relationship', async () => {
      const orphanFile = {
        ...mockFile,
        health_events: null,
        professionals: null,
      }

      mockPrisma.files.findUnique.mockResolvedValue(orphanFile)

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Acesso negado ao arquivo')
    })
  })

  describe('Validações de Segurança', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
    })

    it('should return 404 for files with invalid physicalPath', async () => {
      const fileWithInvalidPath = {
        ...mockFile,
        physicalPath: '/share/malicious.pdf', // Invalid path
      }

      mockPrisma.files.findUnique.mockResolvedValue(fileWithInvalidPath)

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado')
    })

    it('should return 404 when file does not exist on filesystem', async () => {
      mockPrisma.files.findUnique.mockResolvedValue(mockFile)
      mockAccess.mockRejectedValue(new Error('File not found'))

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado no sistema')
    })

    it('should return 404 for non-existent files', async () => {
      mockPrisma.files.findUnique.mockResolvedValue(null)

      const req = createMockRequest('file-1')
      const response = await GET(req, { params: Promise.resolve({ id: 'file-1' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Arquivo não encontrado')
    })
  })

  describe('Auditoria e Métricas', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.files.findUnique.mockResolvedValue(mockFile)
      mockPrisma.user.findUnique.mockResolvedValue({ cpf: '12345678901', name: 'Test User' })
      mockAccess.mockResolvedValue(undefined)
      mockReadFile.mockResolvedValue(Buffer.from('file content'))
    })

    it('should log successful downloads', async () => {
      const req = createMockRequest('file-1')
      await GET(req, { params: Promise.resolve({ id: 'file-1' }) })

      expect(mockLogDocumentSubmission).toHaveBeenCalledWith({
        origin: 'PORTAL_LOGADO',
        receiverCpf: '12345678901',
        patientId: 'user-1',
        patientName: 'Test User',
        fileName: 'test.pdf',
        fileHash: 'hash123',
        protocol: null,
        ip: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        status: 'SUCCESS',
      })
    })

    it('should update download metrics', async () => {
      const req = createMockRequest('file-1')
      await GET(req, { params: Promise.resolve({ id: 'file-1' }) })

      expect(mockPrisma.adminMetrics.upsert).toHaveBeenCalledWith({
        where: { id: 'singleton' },
        update: { totalDownloadBytes: { increment: BigInt(12) } }, // 'file content'.length
        create: { id: 'singleton', totalDownloadBytes: BigInt(12) },
      })
    })
  })
})