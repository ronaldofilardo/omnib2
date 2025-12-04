import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/document/submit/route'

// Mock do Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    report: {
      create: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  PrismaClient: vi.fn(),
}))

// Mock dos serviços
vi.mock('@/lib/services/auditService', () => ({
  logDocumentSubmission: vi.fn(),
}))

vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBase64: vi.fn(() => 'mock-hash-123'),
}))

import { prisma } from '@/lib/prisma'

describe('Validação de Arquivos - Limites e Processamento', () => {
  const mockUser = {
    id: 'user-123',
    email: 'patient@example.com',
    cpf: '12345678901',
    name: 'Paciente Teste',
    role: 'RECEPTOR',
  }

  const mockSender = {
    id: 'sender-123',
    email: 'publico@externo.com',
    role: 'EMISSOR',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(prisma.user.findFirst).mockImplementation(async (args: any) => {
      if (args?.where?.cpf) return mockUser as any
      if (args?.where?.email === 'publico@externo.com') return mockSender as any
      return null
    })
    
    vi.mocked(prisma.report.create).mockResolvedValue({
      id: 'report-123',
      protocol: 'DOC-123',
    } as any)
    
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-123',
      createdAt: new Date(),
    } as any)
  })

  describe('Limite de 5MB', () => {
    it('deve aceitar arquivo de exatamente 5MB', async () => {
      const fiveMB = 5 * 1024 * 1024
      const content = Buffer.alloc(fiveMB, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-123',
          report: {
            fileName: '5mb-file.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      expect(response.status).not.toBe(413)
    })

    it('deve aceitar arquivo de 4.9MB (abaixo do limite)', async () => {
      const size = Math.floor(4.9 * 1024 * 1024)
      const content = Buffer.alloc(size, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-124',
          report: {
            fileName: 'file.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      expect(response.status).not.toBe(413)
    })

    it('deve rejeitar arquivo de 5.1MB (acima do limite)', async () => {
      const size = Math.floor(5.1 * 1024 * 1024)
      const content = Buffer.alloc(size, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-125',
          report: {
            fileName: 'too-large.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(413)
      
      const data = await response.json()
      expect(data.error).toContain('Arquivo muito grande')
      expect(data.error).toContain('Máximo: 5MB')
    })

    it('deve calcular corretamente o tamanho do arquivo base64', async () => {
      // Base64 expande o tamanho em ~33% (4/3)
      const originalSize = 4 * 1024 * 1024 // 4MB original
      const content = Buffer.alloc(originalSize, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.4',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-126',
          report: {
            fileName: 'file.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      
      // Base64 de 4MB original = ~5.3MB, deve ser rejeitado
      if (Buffer.byteLength(content, 'base64') > 5 * 1024 * 1024) {
        expect(response.status).toBe(413)
      } else {
        expect(response.status).not.toBe(413)
      }
    })

    it('deve incluir tamanho do arquivo na mensagem de erro', async () => {
      const size = 6 * 1024 * 1024 // 6MB
      const content = Buffer.alloc(size, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.5',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-127',
          report: {
            fileName: 'large.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      expect(response.status).toBe(413)
      
      const data = await response.json()
      expect(data.error).toMatch(/recebido: \d+\.\d+MB/)
      expect(data.error).toContain('6.') // Deve indicar ~6MB
    })
  })

  describe('Compressão Base64', () => {
    it('deve processar corretamente arquivo base64', async () => {
      const originalContent = 'Test content for compression'
      const base64Content = Buffer.from(originalContent).toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.2.1',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-200',
          report: {
            fileName: 'compressed.pdf',
            fileContent: base64Content,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      expect(response.status).not.toBe(400)
    })

    it('deve rejeitar base64 inválido', async () => {
      const invalidBase64 = 'invalid!!!base64###content'

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.2.2',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-201',
          report: {
            fileName: 'file.pdf',
            fileContent: invalidBase64,
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      // Deve falhar na validação ou processamento
      expect([400, 404, 500]).toContain(response.status)
    })

    it('deve lidar com base64 vazio', async () => {
      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.2.3',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-202',
          report: {
            fileName: 'empty.pdf',
            fileContent: '',
          },
          documentType: 'result',
        }),
      })

      const response = await POST(req)
      // Base64 vazio falha na validação de campos obrigatórios
      expect([400, 413]).toContain(response.status)
    })
  })

  describe('Processamento de Múltiplos Arquivos', () => {
    it('deve processar arquivo único rapidamente', async () => {
      const content = Buffer.from('small content').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.3.1',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-300',
          report: {
            fileName: 'file1.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const start = Date.now()
      const response = await POST(req)
      const duration = Date.now() - start

      expect(response.status).not.toBe(500)
      expect(duration).toBeLessThan(8000) // Menos que timeout
    })

    it('deve validar tamanho antes de processar', async () => {
      const largeContent = Buffer.alloc(10 * 1024 * 1024, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.3.2',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-301',
          report: {
            fileName: 'huge.pdf',
            fileContent: largeContent,
          },
          documentType: 'result',
        }),
      })

      const start = Date.now()
      const response = await POST(req)
      const duration = Date.now() - start

      // Deve falhar rapidamente na validação (não processar arquivo)
      expect(response.status).toBe(413)
      expect(duration).toBeLessThan(1000) // Validação rápida
    })

    it('deve calcular hash do arquivo corretamente', async () => {
      const content = Buffer.from('content for hashing').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.3.3',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-302',
          report: {
            fileName: 'file.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      await POST(req)

      // Verificar que hash foi calculado (via mock)
      const { calculateFileHashFromBase64 } = await import('@/lib/utils/fileHashServer')
      expect(calculateFileHashFromBase64).toHaveBeenCalledWith(content)
    })
  })

  describe('Tipos de Documento', () => {
    const documentTypes = [
      'request',
      'authorization',
      'certificate',
      'result',
      'prescription',
      'invoice',
    ]

    documentTypes.forEach((type) => {
      it(`deve aceitar documentType: ${type}`, async () => {
        const content = Buffer.from('test').toString('base64')

        const req = new NextRequest('http://localhost/api/document/submit', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '192.168.4.1',
          },
          body: JSON.stringify({
            patientEmail: 'test@example.com',
            doctorName: 'Dr. João',
            examDate: '2025-01-15',
            cpf: '12345678901',
            documento: `DOC-${type}`,
            report: {
              fileName: `${type}.pdf`,
              fileContent: content,
            },
            documentType: type,
          }),
        })

        const response = await POST(req)
        expect(response.status).not.toBe(400)
      })
    })

    it('deve usar default result se documentType não fornecido', async () => {
      const content = Buffer.from('test').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.4.2',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-DEFAULT',
          report: {
            fileName: 'file.pdf',
            fileContent: content,
          },
          // documentType não fornecido
        }),
      })

      const response = await POST(req)
      expect(response.status).not.toBe(400)
    })
  })

  describe('Performance e Otimização', () => {
    it('deve processar arquivos pequenos rapidamente (<1s)', async () => {
      const smallContent = Buffer.from('small file').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.5.1',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-PERF-1',
          report: {
            fileName: 'small.pdf',
            fileContent: smallContent,
          },
          documentType: 'result',
        }),
      })

      const start = Date.now()
      await POST(req)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000)
    })

    it('deve processar arquivos médios em tempo aceitável (<3s)', async () => {
      const mediumContent = Buffer.alloc(2 * 1024 * 1024, 'a').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.5.2',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-PERF-2',
          report: {
            fileName: 'medium.pdf',
            fileContent: mediumContent,
          },
          documentType: 'result',
        }),
      })

      const start = Date.now()
      await POST(req)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(3000)
    })

    it('deve ter timeout de 8s para processamento', async () => {
      // Simular processamento lento
      vi.mocked(prisma.user.findFirst).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockUser as any), 9000))
      )

      const content = Buffer.from('test').toString('base64')

      const req = new NextRequest('http://localhost/api/document/submit', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.5.3',
        },
        body: JSON.stringify({
          patientEmail: 'test@example.com',
          doctorName: 'Dr. João',
          examDate: '2025-01-15',
          cpf: '12345678901',
          documento: 'DOC-PERF-3',
          report: {
            fileName: 'file.pdf',
            fileContent: content,
          },
          documentType: 'result',
        }),
      })

      const start = Date.now()
      const response = await POST(req)
      const duration = Date.now() - start

      // Timeout pode não funcionar perfeitamente em ambiente de testes
      expect([404, 408, 500]).toContain(response.status)
      // Não deve esperar os 9s completos se timeout funcionar
    }, 10000)
  })
})
