import { prisma } from '@/lib/prisma'
import type { AuditOrigin, AuditStatus } from '@prisma/client'

interface AuditData {
  origin: AuditOrigin
  emitterCnpj?: string | null
  receiverCpf: string
  patientId?: string | null
  patientName?: string | null
  protocol?: string | null
  fileName: string
  fileHash?: string | null
  documentType?: string | null
  ip: string
  userAgent?: string | null
  status?: AuditStatus
  metadata?: any
}

interface SecurityEventData {
  action: 'AUTH_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE'
  ip: string
  userAgent?: string | null
  userId?: string | null
  resource?: string
  details?: any
}

export async function logDocumentSubmission(data: AuditData) {
  try {
    await prisma.auditLog.create({
      data: {
        origin: data.origin,
        emitterCnpj: data.emitterCnpj || null,
        receiverCpf: data.receiverCpf,
        patientId: data.patientId || null,
        patientName: data.patientName || null,
        protocol: data.protocol || null,
        fileName: data.fileName,
        fileHash: data.fileHash || null,
        documentType: data.documentType || 'result',
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: data.status || 'PROCESSING',
        metadata: data.metadata,
      },
    })
  } catch (error) {
    console.error('[AUDIT LOG FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      data: { ...data, metadata: '[redacted]' },
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra eventos de segurança (falhas de autenticação, acesso não autorizado, etc.)
 */
export async function logSecurityEvent(data: SecurityEventData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        origin: 'PORTAL_LOGADO', // Assume portal logado para uploads
        receiverCpf: 'sistema', // Valor padrão para eventos de sistema
        fileName: data.resource || 'security-event',
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'USER_NOT_FOUND', // Indica falha de segurança
        metadata: {
          userId: data.userId,
          details: data.details,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('[SECURITY AUDIT LOG FALHOU]', {
      error,
      data: { ...data, details: '[redacted]' },
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}
