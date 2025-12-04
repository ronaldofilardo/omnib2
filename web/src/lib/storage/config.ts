export interface StorageConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  uploadTimeout: number
  allowLargeFiles: boolean
  provider: 'local' | 'b2' | 'vercel-compatible'
}

export const STORAGE_CONFIGS: Record<string, StorageConfig> = {
  development: {
    maxFileSize: 10 * 1024 * 1024, // 10MB em desenvolvimento
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    uploadTimeout: 30000, // 30s
    allowLargeFiles: true,
    provider: 'local'
  },
  production: {
    maxFileSize: 5 * 1024 * 1024, // 5MB para Vercel Blob
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    uploadTimeout: 30000, // 30s
    allowLargeFiles: false,
    provider: 'vercel-compatible' // Usar Vercel Blob
  },
  test: {
    maxFileSize: 1 * 1024 * 1024, // 1MB para testes
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    uploadTimeout: 5000,
    allowLargeFiles: true,
    provider: 'local'
  }
}

export function getCurrentStorageConfig(): StorageConfig {
  const env = process.env.NODE_ENV || 'development'
  return STORAGE_CONFIGS[env] || STORAGE_CONFIGS.development
}

export function isLargeFileSupportEnabled(): boolean {
  const config = getCurrentStorageConfig()
  return config.allowLargeFiles
}

export function getMaxFileSize(): number {
  const config = getCurrentStorageConfig()
  return config.maxFileSize
}

export function isMimeTypeAllowed(mimeType: string): boolean {
  const config = getCurrentStorageConfig()
  return config.allowedMimeTypes.includes(mimeType)
}