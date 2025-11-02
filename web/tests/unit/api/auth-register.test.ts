import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../src/app/api/auth/register/route';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock do prisma

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Criar referência tipada para o mock
const mockPrisma = prisma as any;

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create user successfully with valid data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '12345678901',
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
          cpf: '12345678901',
          telefone: '(11) 99999-9999',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toEqual({
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '12345678901',
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(data.user.password).toBeUndefined();
    });

    it('should return 400 when email is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          password: 'password123',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email, senha e CPF são obrigatórios');
    });

    it('should return 400 when password is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email, senha e CPF são obrigatórios');
    });

    it('should return 400 when CPF is missing', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email, senha e CPF são obrigatórios');
    });

    it('should return 400 when CPF has less than 11 digits', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '123456789', // 9 digits
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF deve ter 11 dígitos');
    });

    it('should return 400 when CPF has more than 11 digits', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '123456789012', // 12 digits
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF deve ter 11 dígitos');
    });

    it('should accept CPF in different formats during registration', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'john@example.com',
        name: 'John Doe',
        cpf: '123.456.789-01', // CPF formatado no banco
        telefone: '(11) 99999-9999',
        role: 'RECEPTOR',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe',
          cpf: '12345678901', // CPF sem formatação
          telefone: '(11) 99999-9999',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user.cpf).toBe('123.456.789-01');
    });

    it('should detect duplicate CPF in different formats', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        cpf: '123.456.789-01', // CPF formatado no banco
      }); // CPF já existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901', // CPF sem formatação
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF já cadastrado');
    });

    it('should return 400 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'john@example.com',
      }); // E-mail já existe
      mockPrisma.user.findFirst.mockResolvedValue(null); // CPF não existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Usuário já existe');
    });

    it('should return 400 when CPF already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email não existe
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        cpf: '12345678901',
      }); // CPF já existe

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('CPF já cadastrado');
    });

    it('should return 403 when trying to register as EMISSOR', async () => {
      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
          role: 'EMISSOR',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Registro de emissores não disponível');
    });

    it('should return 500 on database error', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const request = {
        json: vi.fn().mockResolvedValue({
          email: 'john@example.com',
          password: 'password123',
          cpf: '12345678901',
        }),
      } as unknown as Request;

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });
});