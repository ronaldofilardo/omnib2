import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PersonalDataTab from '@/components/PersonalDataTab';

// Mock do fetch global
let mockFetch: any;
beforeEach(() => {
  mockFetch = vi.fn();
  global.fetch = mockFetch;
});

describe('DadosPessoaisTab', () => {
  const mockUserData = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    cpf: '123.456.789-00',
    telefone: '(41) 99999-9999',
  };

  beforeEach(() => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/user/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserData),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it('deve renderizar os dados do usuário corretamente', async () => {
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });
  act(() => {
    render(<PersonalDataTab userId="user-1" />);
  });

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserData.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUserData.cpf)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUserData.telefone)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUserData.email)).toBeInTheDocument();
    });
  });

  it('deve mostrar mensagem de erro quando a API falha', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('Erro ao buscar dados do usuário')));

    render(<PersonalDataTab userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/erro ao buscar dados do usuário/i)).toBeInTheDocument();
    });
  });

  it('deve mostrar mensagem de carregamento inicialmente', () => {
  render(<PersonalDataTab userId="user-1" />);
  expect(screen.getByText('Carregando dados pessoais...')).toBeInTheDocument();
  render(<PersonalDataTab userId="user-1" />);
  });

  it('deve lidar com dados ausentes', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          // CPF e telefone ausentes
        }),
      })
    );

  render(<PersonalDataTab userId="user-1" />);

    await waitFor(() => {
  expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  // Para CPF/telefone ausentes, o valor será string vazia
  expect(screen.getAllByDisplayValue('')).toHaveLength(2);
    });
  });
});