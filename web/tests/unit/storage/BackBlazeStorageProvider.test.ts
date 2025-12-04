import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackBlazeStorageProvider } from '../../../src/lib/storage/BackBlazeStorageProvider';

// Mock crypto
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
    },
  },
});

// Mock fetch globally
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('BackBlazeStorageProvider', () => {
  let provider: BackBlazeStorageProvider;

  const mockEnv = {
    BACKBLAZE_ACCOUNT_ID: 'test-account-id',
    BACKBLAZE_APPLICATION_KEY: 'test-app-key',
    BACKBLAZE_BUCKET_ID: 'test-bucket-id',
    BACKBLAZE_BUCKET_NAME: 'test-bucket-name',
    BACKBLAZE_API_URL: 'https://api.backblazeb2.com',
  };

  beforeEach(() => {
    vi.stubEnv('BACKBLAZE_ACCOUNT_ID', mockEnv.BACKBLAZE_ACCOUNT_ID);
    vi.stubEnv('BACKBLAZE_APPLICATION_KEY', mockEnv.BACKBLAZE_APPLICATION_KEY);
    vi.stubEnv('BACKBLAZE_BUCKET_ID', mockEnv.BACKBLAZE_BUCKET_ID);
    vi.stubEnv('BACKBLAZE_BUCKET_NAME', mockEnv.BACKBLAZE_BUCKET_NAME);
    vi.stubEnv('BACKBLAZE_API_URL', mockEnv.BACKBLAZE_API_URL);

    fetchMock.mockReset();
    provider = new BackBlazeStorageProvider();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(provider).toBeInstanceOf(BackBlazeStorageProvider);
    });

    it('should throw error if credentials are missing', () => {
      vi.stubEnv('BACKBLAZE_ACCOUNT_ID', '');
      expect(() => new BackBlazeStorageProvider()).toThrow('BackBlaze credentials not configured');
    });
  });

  describe('supportsLargeFiles', () => {
    it('should return true', () => {
      expect(provider.supportsLargeFiles()).toBe(true);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return 5GB limit', () => {
      expect(provider.getMaxFileSize()).toBe(5 * 1024 * 1024 * 1024);
    });
  });

  describe('upload', () => {
    const mockFile = {
      name: 'test.txt',
      size: 12,
      type: 'text/plain',
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(12)),
    } as unknown as File;
    const uploadOptions = { expiryDate: '2025-12-31' };

    beforeEach(() => {
      // Mock authentication
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            authorizationToken: 'test-token',
            apiUrl: 'https://api.backblazeb2.com',
          }),
        })
      );

      // Mock get upload URL
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            uploadUrl: 'https://upload.backblazeb2.com',
            uploadAuthToken: 'upload-token',
          }),
        })
      );

      // Mock file upload
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            fileId: 'b2-file-id',
            fileName: 'uploaded-file.txt',
          }),
        })
      );
    });

    it('should upload file successfully', async () => {
      const result = await provider.upload(mockFile, uploadOptions);

      expect(result.success).toBe(true);
      expect(result.fileId).toBeDefined();
      expect(result.url).toContain('https://f002.backblazeb2.com/file/test-bucket-name/');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.name).toBe('test.txt');
      expect(result.metadata.size).toBe(mockFile.size);
      expect(result.metadata.mimeType).toBe('text/plain');
    });
  });

  describe('getUrl', () => {
    it('should throw error if metadata not found', async () => {
      await expect(provider.getUrl('non-existent-id')).rejects.toThrow('File URL not found');
    });
  });

  describe('delete', () => {
    it('should return false (placeholder implementation)', async () => {
      const result = await provider.delete('test-file-id');
      expect(result).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return null (placeholder implementation)', async () => {
      const result = await provider.getMetadata('test-file-id');
      expect(result).toBe(null);
    });
  });
});