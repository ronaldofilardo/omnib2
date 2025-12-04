import { put, head, del } from '@vercel/blob'
import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider'

export class VercelBlobStorageProvider implements StorageProvider {
  async upload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    try {
      const filename = options.filename || file.name
      const result = await put(filename, file, {
        access: 'public',
      })

      return {
        success: true,
        fileId: result.url, // Use URL as fileId
        url: result.url,
        metadata: {
          id: result.url, // Use URL as ID
          name: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          url: result.url,
        } as FileMetadata,
      }
    } catch (error) {
      console.error('Vercel Blob upload error:', error)
      return {
        success: false,
        fileId: '',
        url: '',
        metadata: {} as FileMetadata,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  async getUrl(fileId: string): Promise<string> {
    // fileId is the URL
    return fileId
  }

  async delete(fileId: string): Promise<boolean> {
    try {
      await del(fileId)
      return true
    } catch (error) {
      console.error('Vercel Blob delete error:', error)
      return false
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      const result = await head(fileId)
      return {
        id: fileId,
        name: result.pathname,
        size: result.size,
        mimeType: result.contentType || 'application/octet-stream',
        uploadedAt: result.uploadedAt.toISOString(),
        url: fileId,
      }
    } catch (error) {
      console.error('Vercel Blob metadata error:', error)
      return null
    }
  }

  supportsLargeFiles(): boolean {
    return false // Vercel Blob has limits, but for now false
  }

  getMaxFileSize(): number {
    return 5 * 1024 * 1024 // 5MB, Vercel Blob limit
  }
}