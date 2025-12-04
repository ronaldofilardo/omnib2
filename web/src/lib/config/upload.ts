/**
 * Configurações centralizadas para upload de arquivos
 *
 * Centraliza todas as configurações relacionadas a upload para:
 * - Evitar duplicação de código
 * - Manter consistência entre ambientes
 * - Facilitar manutenção e updates
 */

export interface UploadLimits {
  /** Tamanho máximo do arquivo em bytes */
  maxFileSize: number
  /** Tipos MIME permitidos */
  allowedMimeTypes: string[]
  /** Sufixo para desenvolvimento (ex: "KB", "MB") */
  sizeSuffix: string
}

/**
 * Configurações de upload por ambiente
 */
export const UPLOAD_CONFIG = {
  production: {
    maxFileSize: 2 * 1024, // 2KB para Vercel free (timeout prevention)
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    sizeSuffix: 'KB',
  } as UploadLimits,

  development: {
    maxFileSize: 10 * 1024, // 10KB para testes mais realistas
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ],
    sizeSuffix: 'KB',
  } as UploadLimits,
} as const

/**
 * Obtém configuração de upload baseada no ambiente atual
 */
export function getUploadConfig(): UploadLimits {
  const isProduction = process.env.NODE_ENV === 'production'
  return isProduction ? UPLOAD_CONFIG.production : UPLOAD_CONFIG.development
}

/**
 * Calcula tamanho em unidade legível (KB/MB)
 */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024
  if (kb < 1024) {
    return `${kb.toFixed(0)}KB`
  }
  const mb = kb / 1024
  return `${mb.toFixed(1)}MB`
}

/**
 * Valida se um tipo MIME é permitido
 */
export function isMimeTypeAllowed(mimeType: string, config?: UploadLimits): boolean {
  const uploadConfig = config || getUploadConfig()
  return uploadConfig.allowedMimeTypes.includes(mimeType)
}

/**
 * Gera mensagem de erro para arquivo muito grande
 */
export function getFileTooLargeError(actualSize: number, config?: UploadLimits): string {
  const uploadConfig = config || getUploadConfig()
  const maxSize = formatFileSize(uploadConfig.maxFileSize)
  const actualSizeFormatted = formatFileSize(actualSize)
  return `Arquivo deve ter menos de ${maxSize}. Tamanho atual: ${actualSizeFormatted}`
}