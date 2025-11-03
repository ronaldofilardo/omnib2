import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal';
import { vi } from 'vitest';

describe('Event Creation from Notification - Integration', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockRefreshProfessionals = vi.fn();

  const labNotification = {
    id: 'notif-1',
    payload: {
      doctorName: 'Dr. João Silva',
      examDate: '2024-10-25',
      report: {
        fileName: 'laudo-cardio.pdf',
        fileContent: 'dGVzdA==', // "test" em base64
      },
    },
  };

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
    notification: labNotification,
    professionalId: 'prof-1',
    userId: 'user-1',
    refreshProfessionals: mockRefreshProfessionals,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('completes full event creation flow from lab notification', async () => {
    // Mock global fetch para sempre retornar sucesso
    (global.fetch as any) = vi.fn((url, options) => {
      if (url.includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'prof-1', name: 'Dr. João Silva' },
            { id: 'prof-2', name: 'Dra. Maria Santos' },
          ]),
        });
      }
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-prof-id' }),
        });
      }
      if (url.includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' }),
        });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      if (url.includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve({ ok: true });
      }
      // fallback
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Laudo: laudo-cardio.pdf')).toBeInTheDocument();
    });

    // Modify title
    const titleInput = screen.getByDisplayValue('Laudo: laudo-cardio.pdf');
    fireEvent.change(titleInput, { target: { value: 'Consulta Cardiologia - Laudo' } });

    // Modify date
    const dateInput = screen.getByDisplayValue('2024-10-25');
    fireEvent.change(dateInput, { target: { value: '2024-10-26' } });

    // Modify time
    const startTimeInput = screen.getByDisplayValue('09:00');
    const endTimeInput = screen.getByDisplayValue('09:30');
    fireEvent.change(startTimeInput, { target: { value: '14:00' } });
    fireEvent.change(endTimeInput, { target: { value: '15:00' } });

    // Select professional
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    // Submit
    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    // Verify API calls
    expect(global.fetch).toHaveBeenNthCalledWith(1,
      '/api/professionals?userId=user-1'
    );
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      '/api/events?userId=user-1',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(3,
      '/api/upload-file',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(4,
      '/api/events',
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(String),
      })
    );
  });

  it('handles professional creation when doctor not found', async () => {
    // Mock professionals fetch - doctor not found
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([
        { id: 'prof-2', name: 'Dra. Maria Santos' },
      ]),
    });

    // Mock professional creation
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'new-prof-id', name: 'Dr. João Silva' }),
    });

    // Mock event creation
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'event-id' }),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const professionalSelect = screen.getByRole('combobox');
      expect(professionalSelect).toHaveTextContent('Dr. João Silva (Novo)');
    });

    // Seleciona o profissional "novo" (opção vazia)
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: '' } });

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/professionals'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Dr. João Silva'),
        })
      );
    });
  });

  it('handles event creation failure', async () => {
    // Mock GET /api/professionals - retorna lista de profissionais
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
    });

    // Mock POST /api/professionals - cria novo profissional (necessário porque professionalId está vazio)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'new-prof-id' }),
    });

    // Mock POST /api/events - falha ao criar evento
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Horário conflitante' }),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar evento.')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('handles file upload failure gracefully', async () => {
    // Mock GET /api/professionals - retorna lista de profissionais
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
    });

    // Mock POST /api/events - sucesso ao criar evento
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'event-id' }),
    });

    // Mock POST /api/upload - falha no upload do arquivo
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Upload failed' }),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Seleciona o profissional existente
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar evento.')).toBeInTheDocument();
    });
  });

  it('validates required fields before submission', async () => {
    (global.fetch as any) = vi.fn((url, options) => {
      if (url.includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'prof-1' }) });
      }
      if (url.includes('/api/professionals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]) });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'event-id' }) });
      }
      if (url.includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Seleciona o profissional
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: 'prof-1' } });

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    });

    // Should not show error since all fields are pre-filled
    expect(screen.queryByText('Erro ao criar evento.')).not.toBeInTheDocument();
  });

  it('allows canceling the operation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const cancelButton = screen.getByText('Cancelar');
      fireEvent.click(cancelButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('handles report notification type', async () => {
    const reportNotification = {
      id: 'notif-2',
      payload: {
        reportId: 'report-1',
        title: 'Relatório de Exames',
        protocol: 'PROTO-123',
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([{ id: 'prof-1', name: 'Dr. João Silva' }]),
    });

    render(<CreateEventFromNotificationModal
      {...defaultProps}
      notification={reportNotification}
    />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Novo Evento')).toBeInTheDocument();
    });
  });

  it('updates professional list after creation', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve([]), // No existing professionals
    });

    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'new-prof-id' }),
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'event-id' }),
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    // Seleciona o profissional "novo" (opção vazia)
    const professionalSelect = screen.getByRole('combobox');
    fireEvent.change(professionalSelect, { target: { value: '' } });

    await waitFor(() => {
      const createButton = screen.getByText('Criar Evento');
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(mockRefreshProfessionals).toHaveBeenCalled();
    });
  });
});