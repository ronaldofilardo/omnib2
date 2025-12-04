import '@testing-library/jest-dom'
import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ReportsDashboard } from '../ReportsDashboard'

describe('ReportsDashboard', () => {
  beforeEach(() => {
    // Mock fetch global
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/admin/audit-documents')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            documents: [
              {
                protocol: 'LAB-001',
                patientName: 'João Silva',
                emitterName: 'Laboratório Omni',
                emitterCnpj: '12.345.678/0001-99',
                createdAt: new Date('2024-11-24T10:00:00').toISOString(),
                fileName: 'laudo.pdf',
                fileHash: 'abc123def456',
                documentType: 'result',
                status: 'SUCCESS',
                receiverCpf: '11122233344',
                receivedAt: new Date('2024-11-24T10:05:00').toISOString(),
                origin: 'API_EXTERNA',
              },
              {
                protocol: 'LAB-002',
                patientName: 'Maria Santos',
                emitterName: null,
                emitterCnpj: null,
                createdAt: new Date('2024-11-24T11:00:00').toISOString(),
                fileName: 'exame.pdf',
                fileHash: 'xyz789ghi012',
                documentType: 'result',
                status: 'PROCESSING',
                receiverCpf: '55566677788',
                receivedAt: new Date('2024-11-24T11:05:00').toISOString(),
                origin: 'PORTAL_PUBLICO',
              },
            ],
            total: 2,
          }),
        }) as any
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any
    }) as any
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render loading state initially', () => {
    act(() => {
      render(<ReportsDashboard />)
    })
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('should fetch and display documents', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('LAB-001')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('laudo.pdf')).toBeInTheDocument()
    expect(screen.getByText('LAB-002')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
  })

  it('should display emitter CNPJ when available', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument()
  })

  it('should display dash when emitter name is not available', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    const cells = screen.getAllByText('—')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('should display status badges correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Visualizado')).toBeInTheDocument()
    expect(screen.getByText('Enviado')).toBeInTheDocument()
  })

  it('should format dates correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    // Verificar se as datas estão formatadas (formato brasileiro)
    const dateElements = screen.getAllByText(/24\/11\/2024/i)
    expect(dateElements.length).toBeGreaterThan(0)
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))

    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    // Deve renderizar sem documentos em caso de erro
    expect(screen.queryByText('LAB-001')).not.toBeInTheDocument()
  })

  it('should call API with correct endpoint', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/audit-documents')
    })
  })

  it('should display table headers correctly', async () => {
    render(<ReportsDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Protocolo')).toBeInTheDocument()
    expect(screen.getByText('Arquivo')).toBeInTheDocument()
    expect(screen.getByText('Paciente ID')).toBeInTheDocument()
    expect(screen.getByText('Destinatário')).toBeInTheDocument()
    expect(screen.getByText('Emissor (CNPJ)')).toBeInTheDocument()
    expect(screen.getByText('Data de Envio')).toBeInTheDocument()
    expect(screen.getByText('Data de Recebimento')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })
})
