import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateEventFromNotificationModal from '@/components/CreateEventFromNotificationModal';
import { vi } from 'vitest';

describe('CreateEventFromNotificationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockRefreshProfessionals = vi.fn();

  const labNotification = {
    id: 'notif-1',
    payload: {
      doctorName: 'Dr. João Silva',
      examDate: '2024-10-25',
      report: {
        fileName: 'laudo.pdf',
        fileContent: 'base64content',
      },
    },
  };

  const reportNotification = {
    id: 'notif-2',
    payload: {
      reportId: 'report-1',
      title: 'Relatório Teste',
      protocol: 'PROTO-123',
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
    global.fetch = vi.fn((url, options) => {
      // Profissionais (GET)
      if (url && url.toString().includes('/api/professionals') && (!options || options.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'prof-1', name: 'Dr. João Silva' },
            { id: 'prof-2', name: 'Dra. Maria Santos' }
          ])
        });
      }
      // Profissionais (POST)
      if (url && url.toString().includes('/api/professionals') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-prof-id' })
        });
      }
      // Eventos (POST)
      if (url && url.toString().includes('/api/events') && options && options.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'event-id' })
        });
      }
      // Upload de arquivo
      if (url && url.toString().includes('/api/upload-file')) {
        return Promise.resolve({ ok: true });
      }
      // Eventos (PUT)
      if (url && url.toString().includes('/api/events') && options && options.method === 'PUT') {
        return Promise.resolve({ ok: true });
      }
      // Default
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders modal when open is true', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    expect(screen.getByText('Criar Novo Evento a partir do Laudo')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Criar Novo Evento a partir do Laudo')).not.toBeInTheDocument();
  });

  it('pre-fills title for lab notification', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const titleInput = screen.getByDisplayValue('Laudo: laudo.pdf');
    expect(titleInput).toBeInTheDocument();
  });

  it('pre-fills date for lab notification', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const dateInput = screen.getByDisplayValue('2024-10-25');
    expect(dateInput).toBeInTheDocument();
  });

  it('allows editing title', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const titleInput = screen.getByDisplayValue('Laudo: laudo.pdf');
    fireEvent.change(titleInput, { target: { value: 'Novo Título' } });
    expect(titleInput).toHaveValue('Novo Título');
  });

  it('allows editing date', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const dateInput = screen.getByDisplayValue('2024-10-25');
    fireEvent.change(dateInput, { target: { value: '2024-10-26' } });
    expect(dateInput).toHaveValue('2024-10-26');
  });

  it('allows editing start time', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const startTimeInput = screen.getByDisplayValue('09:00');
    fireEvent.change(startTimeInput, { target: { value: '10:00' } });
    expect(startTimeInput).toHaveValue('10:00');
  });

  it('allows editing end time', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const endTimeInput = screen.getByDisplayValue('09:30');
    fireEvent.change(endTimeInput, { target: { value: '10:30' } });
    expect(endTimeInput).toHaveValue('10:30');
  });

  it('loads professionals on mount', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/professionals?userId=user-1');
    });
  });

  it('selects existing professional if name matches', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('prof-1');
    });
  });

  it('shows "Novo" option when no matching professional', async () => {
    const mockProfessionals = [{ id: 'prof-2', name: 'Dra. Maria Santos' }];
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toHaveTextContent('Dr. João Silva (Novo)');
    });
  });

  it('creates event successfully', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    // Mock create professional
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'new-prof-id' }),
    });

    // Mock create event
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'event-id' }),
    });

    // Mock upload file
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    // Mock update event
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles create event error', async () => {
    const mockProfessionals = [{ id: 'prof-1', name: 'Dr. João Silva' }];
    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockProfessionals),
    });

    (global.fetch as any).mockResolvedValueOnce({
      json: () => Promise.resolve({ id: 'new-prof-id' }),
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<CreateEventFromNotificationModal {...defaultProps} />);

    const createButton = screen.getByText('Criar Evento');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Erro ao criar evento.')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel is clicked', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} />);
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles report notification type', () => {
    render(<CreateEventFromNotificationModal {...defaultProps} notification={reportNotification} />);
    expect(screen.getByDisplayValue('Novo Evento')).toBeInTheDocument();
  });
});