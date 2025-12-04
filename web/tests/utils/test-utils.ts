/**
 * Utilitários para gerenciamento de mocks em testes
 * Facilita o uso e configuração de mocks específicos
 */

import { mockPrisma, resetAllMocks } from '../__mocks__/global'
import { vi } from 'vitest'

/**
 * Configuração padrão para testes de API
 */
export const setupApiMocks = () => {
  resetAllMocks()
  
  // Configurar mocks básicos para user
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER'
  })
  
  // Configurar fetch mock para APIs externas
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
}

/**
 * Configuração para testes de componentes React
 */
export const setupComponentMocks = () => {
  resetAllMocks()
  
  // Mock específicos para componentes
  // Pode ser expandido conforme necessário
}

/**
 * Configuração para testes de arquivos órfãos
 */
export const setupOrphanFilesMocks = () => {
  resetAllMocks()
  
  mockPrisma.user.findUnique.mockResolvedValue({ 
    id: 'user-1', 
    email: 'user@email.com',
    name: 'Test User'
  })
  
  mockPrisma.files.findMany.mockResolvedValue([
    {
      id: 'file-1',
      name: 'arquivo-orfao.pdf',
      isOrphaned: true,
      eventId: null,
      professionalId: 'user-1',
      orphanedReason: 'Teste',
      professionals: { userId: 'user-1' },
      health_events: []
    }
  ])
}

/**
 * Configuração para testes de eventos de saúde
 */
export const setupHealthEventMocks = () => {
  resetAllMocks()
  
  mockPrisma.healthEvent.findMany.mockResolvedValue([
    {
      id: 'event-1',
      title: 'Evento de Teste',
      description: 'Descrição do evento',
      date: new Date('2025-01-15'),
      type: 'CONSULTA',
      userId: 'user-1'
    }
  ])
}

/**
 * Configuração para testes de notificações
 */
export const setupNotificationMocks = () => {
  resetAllMocks()
  
  mockPrisma.notification.findMany.mockResolvedValue([
    {
      id: 'notification-1',
      type: 'LAB_RESULT',
      payload: {
        reportId: 'report-1',
        doctorName: 'Dr. Silva',
        examDate: '2024-01-15',
        report: {
          fileName: 'laudo.pdf',
          fileContent: 'base64content',
        },
        title: 'Laudo de Exame',
        protocol: '12345'
      },
      createdAt: new Date('2024-01-15T10:00:00Z'),
      status: 'PENDING',
      userId: 'user-1'
    }
  ])
}

/**
 * Utilitário para criar mocks personalizados de resposta HTTP
 */
export const createMockResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Utilitário para criar mock request do Next.js
 */
export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new Request(url, options)
}

// Re-exportar para facilitar importações
export { mockPrisma, resetAllMocks }