import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExternalLabSubmit from '../../../src/components/ExternalLabSubmit';

  // Mock FileReader que simula um delay na leitura
const mockBase64 = 'data:application/pdf;base64,dGVzdA==';

class MockFileReader extends FileReader {
  constructor() {
    super();
    Object.defineProperty(this, 'result', {
      value: mockBase64,
      writable: true,
      configurable: true,
      enumerable: true
    });
  }

  readAsDataURL(file: File) {
    setTimeout(() => {
      if (this.onload) {
        const evt = new Event('load') as ProgressEvent<FileReader>;
        Object.defineProperty(evt, 'target', { value: this });
        this.onload.call(this, evt);
      }
    }, 50);
  }
}

global.FileReader = MockFileReader;// Mock fetch
import { vi } from 'vitest';
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ExternalLabSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock padrão para fetch com resposta de sucesso
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ notificationId: 'test-123', receivedAt: new Date().toISOString() })
    }));
  });

  it('should format CPF correctly while typing', () => {
    render(<ExternalLabSubmit />);

    const cpfInput = screen.getByPlaceholderText('000.000.000-00');

    // Digitar CPF
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });

    expect(cpfInput).toHaveValue('123.456.789-01');
  });

  it('should send CPF without formatting to API', async () => {
    const mockFile = new File(['test content'], 'laudo.pdf', { type: 'application/pdf' });

    render(<ExternalLabSubmit fetchImpl={mockFetch} FileReaderImpl={MockFileReader} />);

    // Preencher campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Número do Documento'), { target: { value: 'DOC-123' } });
    fireEvent.change(screen.getByPlaceholderText('Código do Paciente'), { target: { value: 'PAC-456' } });
    fireEvent.change(screen.getByPlaceholderText('Médico Solicitante'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail do Paciente'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'), { target: { value: '2025-11-01' } });

    // Simular seleção de arquivo
    const fileInput = screen.getByTestId('file-upload');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [mockFile] });
    fireEvent.change(fileInput);

    // Submeter formulário
    const submitButton = screen.getByText('Enviar Documento');
    fireEvent.click(submitButton);

    // Aguardar processamento
    await waitFor(() => {
      const call = mockFetch.mock.calls[0][1];
      expect(call.method).toBe('POST');
      const body = JSON.parse(call.body);
      expect(body.cpf).toBe('12345678901'); // CPF sem formatação
      expect(body.pacienteId).toBe('PAC-456'); // paciente_id
    });
  });

  it('should validate CPF format (11 digits)', async () => {
  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

    // Preencher todos os campos obrigatórios, exceto CPF inválido
    fireEvent.change(screen.getByPlaceholderText('Número do Documento'), { target: { value: 'DOC-123' } });
    fireEvent.change(screen.getByPlaceholderText('Código do Paciente'), { target: { value: 'PAC-456' } });
    fireEvent.change(screen.getByPlaceholderText('Médico Solicitante'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail do Paciente'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '123456789' } });
    // Data obrigatória
    fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'), { target: { value: '2025-11-01' } });

    // Não seleciona arquivo aqui pois queremos testar a validação do CPF primeiro
    const submitButton = screen.getByText('Enviar Documento');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Erro: CPF inválido. Deve conter 11 dígitos numéricos.');
    });
  });

  it('should show success message on successful submission', async () => {
    const mockFile = new File(['test content'], 'laudo.pdf', { type: 'application/pdf' });

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

    // Preencher todos os campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Número do Documento'), { target: { value: 'DOC-123' } });
    fireEvent.change(screen.getByPlaceholderText('Código do Paciente'), { target: { value: 'PAC-456' } });
    fireEvent.change(screen.getByPlaceholderText('Médico Solicitante'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail do Paciente'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'), { target: { value: '2025-11-01' } });

    // Simular seleção de arquivo
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
    }

    // Submeter formulário
    const submitButton = screen.getByText('Enviar Documento');
    fireEvent.click(submitButton);

    // Aguardar mensagem de sucesso
    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Sucesso: Documento enviado com sucesso!');
    });
  });

  it('should show error message on API failure', async () => {
    mockFetch.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'User not found by CPF' })
    }));

    const mockFile = new File(['test content'], 'laudo.pdf', { type: 'application/pdf' });

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

    // Preencher todos os campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Número do Documento'), { target: { value: 'DOC-123' } });
    fireEvent.change(screen.getByPlaceholderText('Código do Paciente'), { target: { value: 'PAC-456' } });
    fireEvent.change(screen.getByPlaceholderText('Médico Solicitante'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail do Paciente'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'), { target: { value: '2025-11-01' } });

    // Simular seleção de arquivo
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
    }

    // Submeter formulário
    const submitButton = screen.getByText('Enviar Documento');
    fireEvent.click(submitButton);

    // Aguardar mensagem de erro
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Erro: Não encontramos nenhum usuário com o CPF informado. Verifique se o CPF está correto ou cadastrado no sistema.');
    });
  });

  it('should clear form after successful submission', async () => {
    const mockFile = new File(['test content'], 'laudo.pdf', { type: 'application/pdf' });

  render(<ExternalLabSubmit fetchImpl={mockFetch} />);

    // Preencher todos os campos obrigatórios
    fireEvent.change(screen.getByPlaceholderText('Número do Documento'), { target: { value: 'DOC-123' } });
    fireEvent.change(screen.getByPlaceholderText('Código do Paciente'), { target: { value: 'PAC-456' } });
    fireEvent.change(screen.getByPlaceholderText('Médico Solicitante'), { target: { value: 'Dr. Test' } });
    fireEvent.change(screen.getByPlaceholderText('E-mail do Paciente'), { target: { value: 'patient@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('dd/mm/aaaa'), { target: { value: '2025-11-01' } });

    // Simular seleção de arquivo
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
    }

    // Verificar que campos estão preenchidos
    expect(screen.getByPlaceholderText('Número do Documento')).toHaveValue('DOC-123');
    expect(screen.getByPlaceholderText('Código do Paciente')).toHaveValue('PAC-456');
    expect(screen.getByPlaceholderText('Médico Solicitante')).toHaveValue('Dr. Test');
    expect(screen.getByPlaceholderText('E-mail do Paciente')).toHaveValue('patient@test.com');
    expect(screen.getByPlaceholderText('000.000.000-00')).toHaveValue('123.456.789-01');
    expect(screen.getByPlaceholderText('dd/mm/aaaa')).toHaveValue('2025-11-01');

    // Submeter formulário
    const submitButton = screen.getByText('Enviar Documento');
    fireEvent.click(submitButton);

    // Aguardar mensagem de sucesso
    await waitFor(() => {
      expect(screen.getByTestId('success-message')).toHaveTextContent('Sucesso: Documento enviado com sucesso!');
    });

    // Aguardar limpeza do formulário após sucesso
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Número do Documento')).toHaveValue('');
      expect(screen.getByPlaceholderText('Código do Paciente')).toHaveValue('');
      expect(screen.getByPlaceholderText('Médico Solicitante')).toHaveValue('');
      expect(screen.getByPlaceholderText('E-mail do Paciente')).toHaveValue('');
      expect(screen.getByPlaceholderText('000.000.000-00')).toHaveValue('');
      expect(screen.getByPlaceholderText('dd/mm/aaaa')).toHaveValue('');
    });
  });
});