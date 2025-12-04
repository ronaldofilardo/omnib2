import { describe, it, expect, vi, beforeEach } from 'vitest'

// Garantir ambiente de teste
process.env.NODE_ENV = 'test'

// Mock mínimo de fs/promises com default para ES module
vi.mock('fs/promises', () => {
  const mock = {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
  return { ...mock, default: mock };
});

// Mock mínimo de path com default para ES module
vi.mock('path', () => {
  const mock: any = {
    join: vi.fn((...args: any[]) => {
      // join(process.cwd(), 'public', 'uploads', eventId)
      if (args.length === 4 && args[1] === 'public' && args[2] === 'uploads') {
        return `/uploads/${args[3]}`;
      }
      // join('/uploads/eventId', 'slot-safeFilename')
      if (args.length === 2 && args[0].startsWith('/uploads/')) {
        return `${args[0]}/${args[1]}`;
      }
      // fallback padrão
      return args.join('/');
    })
  };
  mock.default = mock;
  return mock;
});

// Mock mínimo de uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-file-id'),
}));

// Mock do prisma para evitar acesso real ao banco
vi.mock('@/lib/prisma', () => ({
  prisma: {
    files: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    adminMetrics: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock de calculateFileHashFromBuffer
vi.mock('@/lib/utils/fileHashServer', () => ({
  calculateFileHashFromBuffer: vi.fn(() => 'mock-hash'),
}));

// Função utilitária para criar um mock NextRequest mínimo
function createMockNextRequest(formData: FormData) {
  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as any;
}

describe('/api/upload-file', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should sanitize filename and prevent path traversal', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const dangerousFilename = '../../../etc/passwd.jpg';
      const mockFile = new File(['test content'], dangerousFilename, {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.name).not.toBe(dangerousFilename);
      expect(data.name).toMatch(/^etcpasswd-\d+\.jpg$/); // sanitized and timestamped
      expect(data.url).toBe('/api/files/test-file-id/download');
    });

    it('should handle multiple dangerous characters', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const dangerousFilename = 'file<>:"|?*.jpg';
      const mockFile = new File(['test content'], dangerousFilename, {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toMatch(/^file-\d+\.jpg$/); // dangerous chars removed and timestamp added
    });

    it('should prevent directory traversal with encoded characters', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const dangerousFilename = '%2e%2e%2f%2e%2e%2fetc%2fpasswd.jpg'; // URL encoded ../..
      const mockFile = new File(['test content'], dangerousFilename, {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).not.toContain('..');
      expect(data.name).not.toContain('/');
      expect(data.name).toMatch(/^.*-\d+\.jpg$/);
    });

    it('should handle filenames with excessive length', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const longFilename = 'a'.repeat(300) + '.jpg';
      const mockFile = new File(['test content'], longFilename, {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name.length).toBeLessThanOrEqual(255 + 20); // original limit + timestamp
    });

    it('should handle filenames with null bytes', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const dangerousFilename = 'test.jpg\x00.exe';
      const mockFile = new File(['test content'], dangerousFilename, {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).not.toContain('\x00');
      expect(data.name).not.toContain('.exe');
      expect(data.name).toMatch(/^\d+-[a-z0-9]+\.jpg$/); // generated safe name with correct extension
    });

    it('should use mime type extension when filename extension does not match', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const mockFile = new File(['test content'], 'test.png', {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toMatch(/^\d+-[a-z0-9]+\.jpg$/); // generated with correct extension
    });

    it('should return 400 when required fields are missing', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const mockFormData = new FormData();
      // Missing file, slot, eventId

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados incompletos.');
    });

    it('should return 400 for non-image files', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode('test content').buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Apenas arquivos de imagem são aceitos (PNG, JPG, JPEG, GIF, etc.).');
    });

    it('should return 400 for files too large', async () => {
      const { POST } = await import('../../../src/app/api/upload-file/route');
      const largeContent = new Array(15 * 1024).fill('a').join(''); // 15KB > 10KB limit in test env
      const mockFile = new File([largeContent], 'large.jpg', {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode(largeContent).buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toMatch(/arquivo deve ter menos de \d+KB/i);
    });

    it('should warn in development when file approaches production limit', async () => {
      // Temporarily set NODE_ENV to development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { POST } = await import('../../../src/app/api/upload-file/route');
      const nearLimitContent = new Array(2 * 1024).fill('a').join(''); // 2KB > 1.5KB
      const mockFile = new File([nearLimitContent], 'near-limit.jpg', {
        type: 'image/jpeg',
      });
      mockFile.arrayBuffer = vi.fn().mockResolvedValue(new TextEncoder().encode(nearLimitContent).buffer);

      const mockFormData = new FormData();
      mockFormData.append('file', mockFile);
      mockFormData.append('slot', 'profile');
      mockFormData.append('eventId', 'event-123');

      const mockRequest = createMockNextRequest(mockFormData);

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200); // Should succeed but warn
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[UPLOAD-FILE WARNING]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('se aproxima do limite de produção (2KB)')
      );

      // Restore original env
      process.env.NODE_ENV = originalEnv;
      consoleWarnSpy.mockRestore();
    });
  });
});