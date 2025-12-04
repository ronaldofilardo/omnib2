import { StorageProvider } from './StorageProvider'
import { LocalStorageProvider } from './LocalStorageProvider'
import { VercelCompatibleStorageProvider } from './VercelCompatibleStorageProvider'
import { getCurrentStorageConfig } from './config'

export class StorageManager {
  private static instance: StorageManager
  private provider: StorageProvider

  private constructor() {
    this.provider = this.createProvider()
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  private createProvider(): StorageProvider {
    const config = getCurrentStorageConfig()

    switch (config.provider) {
      case 'local':
        // Em produção, usar provider compatível com Vercel
        if (process.env.NODE_ENV === 'production') {
          return new VercelCompatibleStorageProvider()
        }
        return new LocalStorageProvider()

      case 'vercel-compatible':
        return new VercelCompatibleStorageProvider()

      case 'b2':
        // TODO: Implementar B2StorageProvider quando necessário
        return new LocalStorageProvider()

      default:
        return new LocalStorageProvider()
    }
  }

  getProvider(): StorageProvider {
    return this.provider
  }

  // Métodos convenientes
  async upload(file: File, options?: any) {
    return this.provider.upload(file, options || {})
  }

  async getUrl(fileId: string) {
    return this.provider.getUrl(fileId)
  }

  async delete(fileId: string) {
    return this.provider.delete(fileId)
  }

  supportsLargeFiles() {
    return this.provider.supportsLargeFiles()
  }

  getMaxFileSize() {
    return this.provider.getMaxFileSize()
  }

  async getMetadata(fileId: string) {
    return this.provider.getMetadata(fileId)
  }
}

// Exportar instância singleton
export const storageManager = StorageManager.getInstance()