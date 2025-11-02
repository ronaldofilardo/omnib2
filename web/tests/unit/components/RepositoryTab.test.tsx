import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RepositoryTab } from '../../../src/components/RepositoryTab'

describe('RepositoryTab', () => {
  const mockEvents = [
    {
      id: '1',
      title: 'Consulta Cardiologia',
      date: '2024-10-25T10:00:00Z',
      startTime: '10:00',
      endTime: '11:00',
      files: [
        {
          slot: 'request',
          name: 'requisicao.pdf',
          url: 'http://example.com/requisicao.pdf',
        },
        {
          slot: 'result',
          name: 'laudo.pdf',
          url: 'http://example.com/laudo.pdf',
        },
      ],
      professional: {
        id: '1',
        name: 'Dr. João Silva',
        specialty: 'Cardiologia',
      },
    },
    {
      id: '2',
      title: 'Exame Dermatologia',
      date: '2024-10-25T14:00:00Z',
      startTime: '14:00',
      endTime: '15:00',
      files: [
        {
          slot: 'certificate',
          name: 'atestado.pdf',
          url: 'http://example.com/atestado.pdf',
        },
      ],
      professional: {
        id: '2',
        name: 'Dra. Maria Santos',
        specialty: 'Dermatologia',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.alert = vi.fn()
  })

  it('renders repository tab with title and current date', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    expect(screen.getByText('Repositório de Arquivos')).toBeInTheDocument()
    // Date will be current date, so we just check it exists
    expect(screen.getByText(/^\d{2}\/\d{2}\/\d{4} - /)).toBeInTheDocument()
  })

  it('shows loading state initially', async () => {
    ;(global.fetch as any).mockImplementationOnce(() => new Promise(() => {}))

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    expect(screen.getByText('Carregando repositório...')).toBeInTheDocument()
  })

  it('renders events with files', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      // Busca todos os h3 e verifica o texto completo
      const headings = screen.getAllByRole('heading', { level: 3 })
      expect(
        headings.some(h => h.textContent?.includes('Consulta Cardiologia - Dr. João Silva - 10:00 - 11:00'))
      ).toBe(true)
      expect(
        headings.some(h => h.textContent?.includes('Exame Dermatologia - Dra. Maria Santos - 14:00 - 15:00'))
      ).toBe(true)
    })
  })

  it('displays file summary correctly', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      expect(screen.getByText(/Total: 3 documento\(s\)/)).toBeInTheDocument()
    })
  })

  it('filters events by search term', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      const els = screen.getAllByText((_, el) => !!el && el.textContent?.includes('Consulta Cardiologia'))
      expect(els.length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText(
      'Buscar por evento, profissional ou arquivo...'
    )
    fireEvent.change(searchInput, { target: { value: 'Cardiologia' } })

    await waitFor(() => {
      const filteredEls = screen.getAllByText((_, el) => !!el && el.textContent?.includes('Consulta Cardiologia'))
      expect(filteredEls.length).toBeGreaterThan(0)
      expect(screen.queryByText('Exame Dermatologia')).not.toBeInTheDocument()
    })
  })

  it('shows no results message when search has no matches', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      const els = screen.getAllByText((_, el) => !!el && el.textContent?.includes('Consulta Cardiologia'))
      expect(els.length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText(
      'Buscar por evento, profissional ou arquivo...'
    )
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      const noResultEls = screen.getAllByText((_, el) => !!el && el.textContent?.includes('Nenhum resultado encontrado para sua busca.'))
      expect(noResultEls.length).toBeGreaterThan(0)
    })
  })

  it('shows empty state when no events', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      const emptyEls = screen.getAllByText((_, el) => !!el && el.textContent?.includes('Nenhum arquivo encontrado no seu repositório.'))
      expect(emptyEls.length).toBeGreaterThan(0)
    })
  })

  it('groups events by date', async () => {
    const eventsSameDate = [
      ...mockEvents,
      {
        ...mockEvents[0],
        id: '3',
        title: 'Consulta Seguimento',
        startTime: '11:00',
        endTime: '12:00',
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(eventsSameDate),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    await waitFor(() => {
      // Deve haver pelo menos um header de data com o texto esperado
      const dateHeaders = screen.getAllByText((content, el) =>
        !!el && /^25\/10\/2024 - /.test(el.textContent || '')
      )
      expect(dateHeaders.length).toBeGreaterThan(0)
      // Todos os headers encontrados devem ter o mesmo texto
      dateHeaders.forEach(header => {
        expect(header.textContent).toContain('25/10/2024 - sexta-feira')
      })
    })
  })

  it('renders file slots correctly', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockEvents[0]]),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    // Verifica slot Solicitação
    const reqLabel = await screen.findByText('Solicitação')
    expect(reqLabel.closest('div')?.textContent).toContain('Solicitação')
    expect(reqLabel.closest('div')?.textContent).toContain('requisicao.pdf')

    // Verifica slot Laudo/Resultado
    const laudoLabel = screen.getByText('Laudo/Resultado')
    expect(laudoLabel.closest('div')?.textContent).toContain('Laudo/Resultado')
    expect(laudoLabel.closest('div')?.textContent).toContain('laudo.pdf')

    // Verifica slot vazio Autorização
    const autoLabel = screen.getByText('Autorização')
    expect(autoLabel.closest('div')?.textContent).toContain('Autorização')
  })

  it('handles view file action', async () => {
    global.open = vi.fn()
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockEvents[0]]),
    })

    await act(async () => {
      render(<RepositoryTab userId="user-1" />)
    })

    const viewButtons = await screen.findAllByTitle('Visualizar')
    fireEvent.click(viewButtons[0])

    expect(global.open).toHaveBeenCalledWith(
      'http://example.com/requisicao.pdf',
      '_blank'
    )
  })

  it('handles delete file action', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockEvents[0]]),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents[0]),
    })
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<RepositoryTab userId="user-1" />)

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Deletar')
      fireEvent.click(deleteButtons[0])
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/events',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"id":"1"')
        })
      )
    })

    confirmSpy.mockRestore()
  })

  it('handles upload file action and updates file list', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([mockEvents[0]]),
    })

    render(<RepositoryTab userId="user-1" />)

    const uploadButtons = await screen.findAllByTitle('Upload')
    expect(uploadButtons.length).toBeGreaterThan(0)

    // Mock para upload
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        url: 'http://example.com/novo-arquivo.pdf',
        name: 'novo-arquivo.pdf',
      }),
    })

    // Simula seleção de arquivo
    const file = new File(['conteudo'], 'novo-arquivo.pdf', { type: 'application/pdf' })
    const input = screen.getAllByTitle('Upload')[0].parentElement?.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    // Após upload, o novo arquivo deve aparecer na lista
    // (simulação: não há re-fetch, mas o estado local é atualizado)
    // O nome do novo arquivo deve estar presente
    await waitFor(() => {
      const spans = screen.getAllByText((_, node) => 
        node?.textContent?.includes('novo-arquivo.pdf') ?? false
      )
      expect(spans.length).toBeGreaterThan(0)
    })
  })

  it('handles API error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'API Error',
    })

    render(<RepositoryTab userId="user-1" />)

    await screen.findByTestId('repository-tab')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[RepositoryTab] Erro ao carregar repositório:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })
})
