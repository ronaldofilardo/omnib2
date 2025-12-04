import { v2 as cloudinary } from 'cloudinary'
import { StorageProvider, FileMetadata, UploadOptions, StorageResult } from './StorageProvider'

export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials not configured')
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    })
  }

  async upload(file: File, options: UploadOptions = {}): Promise<StorageResult> {
    try {
      // Convert File to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'omni-files',
            public_id: `${Date.now()}-${file.name}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          }
        )
        uploadStream.end(buffer)
      })

      return {
        success: true,
        fileId: result.secure_url,
        url: result.secure_url,
        metadata: {
          id: result.secure_url,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          url: result.secure_url,
        } as FileMetadata,
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error)
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
      // Extract public_id from URL
      const urlParts = fileId.split('/upload/')[1]
      if (!urlParts) return false
      const publicIdWithExtension = urlParts.split('/').pop()
      if (!publicIdWithExtension) return false
      const publicId = `omni-files/${publicIdWithExtension.split('.')[0]}`

      await cloudinary.uploader.destroy(publicId)
      return true
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      return false
    }
  }

  async getMetadata(fileId: string): Promise<FileMetadata | null> {
    try {
      // Extract public_id from URL
      const urlParts = fileId.split('/upload/')[1]
      if (!urlParts) return null
      const publicIdWithExtension = urlParts.split('/').pop()
      if (!publicIdWithExtension) return null
      const publicId = `omni-files/${publicIdWithExtension.split('.')[0]}`

      const result = await cloudinary.api.resource(publicId)

      return {
        id: fileId,
        name: result.public_id.split('/').pop() || 'unknown',
        size: result.bytes,
        mimeType: result.format ? `image/${result.format}` : 'application/octet-stream',
        uploadedAt: result.created_at,
        url: fileId,
      }
    } catch (error) {
      console.error('Cloudinary metadata error:', error)
      return null
    }
  }

  supportsLargeFiles(): boolean {
    return false // Cloudinary has limits, but 2MB is fine
  }

  getMaxFileSize(): number {
    return 2 * 1024 * 1024 // 2MB limit
  }
}