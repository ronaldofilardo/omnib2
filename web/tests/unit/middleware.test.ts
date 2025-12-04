import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config } from '../../middleware';

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exportações básicas', () => {
    it('deve exportar função middleware', () => {
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('deve exportar config com matcher', () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBe('/');
    });
  });

  describe('Bloqueio de rotas /share/', () => {
    it('deve bloquear acesso a /share/ com 404', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/test'));
      const response = middleware(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: 'Not found' });
    });

    it('deve bloquear acesso a /share/subpath com 404', () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/subfolder/file'));
      const response = middleware(request);

      expect(response.status).toBe(404);
    });

    it('deve bloquear acesso a /share/arquivo.pdf', async () => {
      const request = new NextRequest(new URL('http://localhost:3000/share/arquivo.pdf'));
      const response = middleware(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toEqual({ error: 'Not found' });
    });
  });

  describe('Bypass de rotas de arquivos', () => {
    it('deve permitir acesso a /api/files/download', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/files/download/123'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/upload', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/upload'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /uploads/', () => {
      const request = new NextRequest(new URL('http://localhost:3000/uploads/file.pdf'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /uploads/subpasta/arquivo.pdf', () => {
      const request = new NextRequest(new URL('http://localhost:3000/uploads/subpasta/arquivo.pdf'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/laudos/upload', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/laudos/upload'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a /api/upload-file', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/upload-file'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Outras rotas', () => {
    it('deve permitir acesso a rotas normais', () => {
      const request = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a API routes normais', () => {
      const request = new NextRequest(new URL('http://localhost:3000/api/users'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a home', () => {
      const request = new NextRequest(new URL('http://localhost:3000/'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('deve permitir acesso a páginas de autenticação', () => {
      const request = new NextRequest(new URL('http://localhost:3000/login'));
      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });
});