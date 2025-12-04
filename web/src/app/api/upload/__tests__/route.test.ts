import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock do auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock do Prisma
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      adminMetrics: {
        upsert: vi.fn(),
      },
    },
  };
});

// Mock do fs
vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('fs', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const mockAuth = auth as any
const mockPrisma = prisma as any

describe('/api/upload - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (formData: FormData) => {
    return {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest
  }

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'RECEPTOR',
  }

  describe('Autenticação', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const formData = new FormData()
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Autenticação obrigatória')
    })

    it('should proceed with upload if user is authenticated', async () => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})

      const formData = new FormData()
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('uploadDate')
    })
  })

  describe('Validação de arquivo', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue(mockUser)
      mockPrisma.adminMetrics.upsert.mockResolvedValue({})
    })

    it('should return 400 if no file is provided', async () => {
      const formData = new FormData()

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Nenhum arquivo enviado')
    })

    it('should return 400 for file too large', async () => {
      const largeFile = new File(['x'.repeat(3 * 1024)], 'large.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('file', largeFile)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Arquivo deve ter menos de')
    })

    it('should return 400 for invalid file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', invalidFile)

      const req = createMockRequest(formData)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Somente arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)')
    })
  })
})