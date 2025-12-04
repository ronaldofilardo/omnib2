import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../page';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Definir pushMock no escopo superior para ser usado no mock
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    // Mock fetch global para simular resposta da API
    global.fetch = vi.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/admin/metrics')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalFiles: 10,
            uploadVolumeMB: 123.45,
            downloadVolumeMB: 67.89,
          }),
        }) as any;
      }
      // Mock para /api/admin/audit-documents
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
                dataVisualizacao: new Date('2024-11-24T10:10:00').toISOString(),
                origin: 'API_EXTERNA',
              },
              {
                protocol: 'LAB-002',
                patientName: 'Maria Santos',
                emitterName: 'Envio Público',
                emitterCnpj: null,
                createdAt: new Date('2024-11-24T11:00:00').toISOString(),
                fileName: 'exame.pdf',
                fileHash: 'xyz789ghi012',
                documentType: 'result',
                status: 'SUCCESS',
                receiverCpf: '55566677788',
                receivedAt: new Date('2024-11-24T11:05:00').toISOString(),
                dataVisualizacao: null,
                origin: 'PORTAL_PUBLICO',
              },
            ],
            total: 2,
          }),
        }) as any;
      }
      // Mock para /api/admin/users
      if (typeof url === 'string' && url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            users: [
              {
                id: '1',
                email: 'admin@omni.com',
                name: 'Administrador',
                role: 'ADMIN',
                createdAt: new Date('2024-11-24T10:00:00').toISOString(),
                cpf: null,
                emissorInfo: null
              },
              {
                id: '2',
                email: 'emissor@omni.com',
                name: 'Emissor Teste',
                role: 'EMISSOR',
                createdAt: new Date('2024-11-24T11:00:00').toISOString(),
                cpf: null,
                emissorInfo: { cnpj: '12345678000123' }
              },
              {
                id: '3',
                email: 'receptor@omni.com',
                name: 'Receptor Teste',
                role: 'RECEPTOR',
                createdAt: new Date('2024-11-24T12:00:00').toISOString(),
                cpf: '98765432100',
                emissorInfo: null
              }
            ],
          }),
        }) as any;
      }
      // Mock para logout
      if (typeof url === 'string' && url.includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
      }
      // Default
      return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
    });
    pushMock.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('deve exibir o header com identidade visual', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByText('Dashboard do Administrador')).toBeInTheDocument();
    expect(screen.getByText('Gerenciamento do Sistema')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /logo omni saúde/i })).toBeInTheDocument();
  });

  it('deve exibir a tabela de documentos de auditoria com dados', async () => {
    render(<AdminDashboard />);
    // Aguardar que o loading termine
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Total de Arquivos')).toBeInTheDocument();
    expect(screen.getByText('Volume de Upload (MB)')).toBeInTheDocument();
    expect(screen.getByText('Volume de Download (MB)')).toBeInTheDocument();
    
    // Aguardar que a tabela apareça
    await waitFor(() => {
      expect(screen.getByText('LAB-001')).toBeInTheDocument();
    });
    
    // Verificar dados da tabela
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Laboratório Omni')).toBeInTheDocument();
    expect(screen.getByText('laudo.pdf')).toBeInTheDocument();
    expect(screen.getByText('LAB-002')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('Envio Público')).toBeInTheDocument();
  });

  it('deve exibir as abas de navegação', async () => {
    render(<AdminDashboard />);
    expect(await screen.findByText('Rastreio')).toBeInTheDocument();
    expect(screen.getByText('Usuários')).toBeInTheDocument();
  });

  it('deve iniciar na aba Rastreio por padrão', async () => {
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
    // Verificar que a aba Rastreio está ativa (com border verde)
    const rastreioTab = screen.getByText('Rastreio');
    expect(rastreioTab).toHaveClass('text-[#10B981]');
    expect(rastreioTab).toHaveClass('border-[#10B981]');
  });

  it('deve permitir alternar para a aba Usuários', async () => {
    render(<AdminDashboard />);
    const user = userEvent.setup();

    const usuariosTab = await screen.findByText('Usuários');
    await user.click(usuariosTab);

    // Verificar que a aba Usuários está ativa
    expect(usuariosTab).toHaveClass('text-[#10B981]');
    expect(usuariosTab).toHaveClass('border-[#10B981]');

    // Verificar que a aba Rastreio não está mais ativa
    const rastreioTab = screen.getByText('Rastreio');
    expect(rastreioTab).not.toHaveClass('border-[#10B981]');
  });

  it('deve exibir a tabela de usuários na aba Usuários', async () => {
    render(<AdminDashboard />);
    const user = userEvent.setup();

    // Alternar para a aba Usuários
    const usuariosTab = await screen.findByText('Usuários');
    await user.click(usuariosTab);

    // Aguardar carregamento
    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    // Verificar cabeçalhos da tabela
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('E-mail')).toBeInTheDocument();
    expect(screen.getByText('Registro')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Data de Criação')).toBeInTheDocument();

    // Verificar dados dos usuários
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('admin@omni.com')).toBeInTheDocument();
    expect(screen.getByText('Emissor Teste')).toBeInTheDocument();
    expect(screen.getByText('emissor@omni.com')).toBeInTheDocument();
    expect(screen.getByText('Receptor Teste')).toBeInTheDocument();
    expect(screen.getByText('receptor@omni.com')).toBeInTheDocument();

    // Verificar registros (CPF/CNPJ)
    expect(screen.getByText('12345678000123')).toBeInTheDocument(); // CNPJ do emissor
    expect(screen.getByText('98765432100')).toBeInTheDocument(); // CPF do receptor

    // Verificar tipos
    expect(screen.getAllByText('ADMIN')).toHaveLength(1);
    expect(screen.getAllByText('EMISSOR')).toHaveLength(1);
    expect(screen.getAllByText('RECEPTOR')).toHaveLength(1);
  });
});
