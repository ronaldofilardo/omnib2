import { render, screen, waitFor } from '@testing-library/react';
import { ReportsDashboard } from '@/components/ReportsDashboard';
import { vi } from 'vitest';

describe('ReportsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ReportsDashboard />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders reports table when data is loaded', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        title: 'Laudo 1',
        fileName: 'laudo1.pdf',
        fileUrl: '/files/laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: '2024-10-25T11:00:00Z',
        viewedAt: '2024-10-25T12:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
      {
        id: 'report-2',
        protocol: '2025-00002',
        title: 'Laudo 2',
        fileName: 'laudo2.pdf',
        fileUrl: '/files/laudo2.pdf',
        status: 'RECEIVED',
        sentAt: '2024-10-26T10:00:00Z',
        receivedAt: null,
        viewedAt: null,
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('laudo1.pdf')).toBeInTheDocument();
      expect(screen.getByText('laudo2.pdf')).toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        title: 'Laudo 1',
        fileName: 'laudo1.pdf',
        fileUrl: '/files/laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
      {
        id: 'report-2',
        protocol: '2025-00002',
        title: 'Laudo 2',
        fileName: 'laudo2.pdf',
        fileUrl: '/files/laudo2.pdf',
        status: 'RECEIVED',
        sentAt: '2024-10-26T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
      {
        id: 'report-3',
        protocol: '2025-00003',
        title: 'Laudo 3',
        fileName: 'laudo3.pdf',
        fileUrl: '/files/laudo3.pdf',
        status: 'VIEWED',
        sentAt: '2024-10-27T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('ENVIADO')).toBeInTheDocument();
      expect(screen.getByText('RECEBIDO')).toBeInTheDocument();
      expect(screen.getByText('VISUALIZADO')).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        title: 'Laudo 1',
        fileName: 'laudo1.pdf',
        fileUrl: '/files/laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: '2024-10-25T11:00:00Z',
        viewedAt: '2024-10-25T12:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      // Checa se a data '25/10/2024' aparece pelo menos 3 vezes (sentAt, receivedAt, viewedAt)
      const dateMatches = screen.getAllByText((content) =>
        typeof content === 'string' && content.includes('25/10/2024')
      );
  expect(dateMatches.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows dash for null dates', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        title: 'Laudo 1',
        fileName: 'laudo1.pdf',
        fileUrl: '/files/laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: null,
        viewedAt: null,
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBe(1); // apenas receivedAt é nulo
    });
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao carregar relatórios:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles empty reports array', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      // Should render table headers but no data rows
      expect(screen.getByText('Arquivo')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Data de Envio')).toBeInTheDocument();
    });
  });

  it('renders table headers correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Protocolo')).toBeInTheDocument();
      expect(screen.getByText('Arquivo')).toBeInTheDocument();
      expect(screen.getByText('Destinatário')).toBeInTheDocument();
      expect(screen.getByText('Data de Envio')).toBeInTheDocument();
      expect(screen.getByText('Data de Recebimento')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Verificar que colunas removidas não existem
      expect(screen.queryByText('Título')).not.toBeInTheDocument();
      expect(screen.queryByText('Emissor')).not.toBeInTheDocument();
      expect(screen.queryByText('Data de Visualização')).not.toBeInTheDocument();
    });
  });

  it('applies correct CSS classes for status badges', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        title: 'Laudo 1',
        fileName: 'laudo1.pdf',
        fileUrl: '/files/laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
      {
        id: 'report-2',
        protocol: '2025-00002',
        title: 'Laudo 2',
        fileName: 'laudo2.pdf',
        fileUrl: '/files/laudo2.pdf',
        status: 'RECEIVED',
        sentAt: '2024-10-26T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
      {
        id: 'report-3',
        protocol: '2025-00003',
        title: 'Laudo 3',
        fileName: 'laudo3.pdf',
        fileUrl: '/files/laudo3.pdf',
        status: 'VIEWED',
        sentAt: '2024-10-27T10:00:00Z',
        sender: { name: 'Emissor Teste' },
        receiver: { name: 'Paciente Teste' },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      // O componente pode renderizar múltiplos badges, então usamos getAllByText
      const statusBadges = screen.getAllByText('ENVIADO');
      expect(statusBadges.length).toBeGreaterThan(0);
      statusBadges.forEach(badge => expect(badge).toHaveClass('bg-blue-100', 'text-blue-800'));
      const receivedBadges = screen.getAllByText('RECEBIDO');
      expect(receivedBadges.length).toBeGreaterThan(0);
      receivedBadges.forEach(badge => expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800'));
      const viewedBadges = screen.getAllByText('VISUALIZADO');
      expect(viewedBadges.length).toBeGreaterThan(0);
      viewedBadges.forEach(badge => expect(badge).toHaveClass('bg-green-100', 'text-green-800'));
    });
  });

  it('handles network error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Erro ao carregar relatórios:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('renders table with correct structure', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        fileName: 'laudo1.pdf',
        status: 'ENVIADO',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: '2024-10-25T11:00:00Z',
        sender: { name: 'Laboratório Teste' },
        receiver: { name: 'Paciente Teste' }
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      // Check table structure
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();

      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(6); // Protocolo, Arquivo, Destinatário, Data de Envio, Data de Recebimento, Status

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
    });
  });

  it('displays receivedAt with time format', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        fileName: 'laudo1.pdf',
        status: 'RECEIVED',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: '2024-10-25T11:30:45Z',
        sender: { name: 'Laboratório Teste' },
        receiver: { name: 'Paciente Teste' }
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      // Aceita tanto com vírgula quanto sem, usando regex
      const matcher = (content: string) => /25\/10\/2024[\s,]+08:30:45/.test(content);
      expect(screen.getByText(matcher)).toBeInTheDocument();
    });
  });

  it('shows dash for missing receivedAt', async () => {
    const mockReports = [
      {
        id: 'report-1',
        protocol: '2025-00001',
        fileName: 'laudo1.pdf',
        status: 'SENT',
        sentAt: '2024-10-25T10:00:00Z',
        receivedAt: null,
        sender: { name: 'Laboratório Teste' },
        receiver: { name: 'Paciente Teste' }
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ reports: mockReports }),
    });

    render(<ReportsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});