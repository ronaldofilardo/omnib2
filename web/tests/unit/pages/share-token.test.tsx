
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ShareAccess from '../../../src/app/shared/[token]/page'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock do fetch
const mockFetch = vi.fn()
;(globalThis as any).fetch = mockFetch

// Mock do React use - usando vi.mock para evitar hoisting issues
vi.mock('react', async () => {
  const actual = await vi.importActual('react') as any
  return {
    ...actual,
    use: vi.fn()
  }
})

const { use: mockUse } = await import('react')

describe('ShareAccess Page', () => {
  const mockParams = { token: 'abc123' }

  beforeEach(() => {
    vi.clearAllMocks()
    // Configurar o mock do use hook
    vi.mocked(mockUse).mockReturnValue(mockParams)
  })

  it('renders access form initially', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    expect(screen.getByText('Acesso a Documentos')).to.exist
    expect(screen.getByText('Por favor, insira o código de acesso fornecido pelo paciente.')).to.exist
    expect(screen.getByPlaceholderText('388910')).to.exist
    expect(screen.getByRole('button', { name: /acessar arquivos/i })).to.exist
  })

  it('validates code input (only numbers, max 6 digits)', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')

    // Digitar letras (deve ser filtrado)
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input).toHaveValue('')

    // Digitar números
    fireEvent.change(input, { target: { value: '123456' } })
    expect(input).toHaveValue('123456')

    // Digitar mais de 6 dígitos (deve truncar)
    fireEvent.change(input, { target: { value: '123456789' } })
    expect(input).toHaveValue('123456')
  })

  it('disables submit button when code is incomplete', async () => {
    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    // Código incompleto
    fireEvent.change(input, { target: { value: '12345' } })
    expect(button).toBeDisabled()

    // Código completo
    fireEvent.change(input, { target: { value: '123456' } })
    expect(button).not.toBeDisabled()
  })

  it('submits code and displays files on success', async () => {
    const mockFiles = [
      { id: 'file-0', name: 'exame.pdf', type: 'pdf', url: 'https://example.com/exame.pdf' },
      { id: 'file-1', name: 'receita.jpg', type: 'jpg', url: 'https://example.com/receita.jpg' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/share/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'abc123', code: '123456' })
      })
    })

    // Verificar se os arquivos são exibidos
    expect(screen.getByText('Arquivos Compartilhados')).to.exist
    expect(screen.getByText('exame.pdf')).to.exist
    expect(screen.getByText('receita.jpg')).to.exist
    expect(screen.getAllByRole('link', { name: /baixar/i })).toHaveLength(2)
  })

  it('displays error message on invalid code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Código de acesso incorreto' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Código de acesso incorreto')).to.exist
    })

    // Form ainda deve estar visível
    expect(screen.getByPlaceholderText('388910')).to.exist
  })

  it('displays error message on expired link', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Link expirado ou inválido' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Link expirado ou inválido')).to.exist
    })
  })

  it('displays error message on already used link', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Este link já foi utilizado' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Este link já foi utilizado')).to.exist
    })
  })

  it('shows loading state during validation', async () => {
    let resolveFetch!: (value: any) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })

    mockFetch.mockReturnValueOnce(fetchPromise)

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    // Verificar estado de loading
    expect(screen.getByText('Validando...')).to.exist
    expect(button).toBeDisabled()

    // Resolver a promise
    resolveFetch({
      ok: true,
      json: () => Promise.resolve({ files: [{ id: '1', name: 'test.pdf', type: 'pdf', url: 'url' }] })
    })

    await waitFor(() => {
      expect(screen.getByText('Arquivos Compartilhados')).to.exist
    })
  })

  it('handles network errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Erro de rede' })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    await act(async () => {
      fireEvent.click(button)
    })

    await waitFor(() => {
      expect(screen.getByText('Erro de rede')).to.exist
    })
  })

  it('opens file links in new tab when clicked', async () => {
    const mockFiles = [
      { id: 'file-0', name: 'exame.pdf', type: 'pdf', url: 'https://example.com/exame.pdf' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('exame.pdf')).to.exist
    })

    // Verificar se o link tem target="_blank"
    const fileLink = screen.getByText('exame.pdf')
    expect(fileLink.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('provides download buttons for files', async () => {
    const mockFiles = [
      { id: 'file-0', name: 'exame.pdf', type: 'pdf', url: 'https://example.com/exame.pdf' }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ files: mockFiles })
    })

    await act(async () => {
      render(<ShareAccess params={Promise.resolve(mockParams)} />)
    })

    const input = screen.getByPlaceholderText('388910')
    const button = screen.getByRole('button', { name: /acessar arquivos/i })

    fireEvent.change(input, { target: { value: '123456' } })
    fireEvent.click(button)

    await waitFor(() => {
      const downloadLink = screen.getByRole('link', { name: /baixar/i })
      expect(downloadLink).toBeInTheDocument()
      expect(downloadLink).toHaveAttribute('href', 'https://example.com/exame.pdf')
      expect(downloadLink).toHaveAttribute('download')
    })
  })
})