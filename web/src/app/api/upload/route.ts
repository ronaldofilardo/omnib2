import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getUploadConfig, getFileTooLargeError, isMimeTypeAllowed } from '@/lib/config/upload'
import { auth } from '@/lib/auth'
import { uploadRateLimiter } from '@/lib/utils/rateLimit'
import { logSecurityEvent } from '@/lib/services/auditService'

const uploadConfig = getUploadConfig()

// Pasta para armazenar uploads
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')



export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') ||
             'unknown'

  // Rate limiting
  const rateLimitResult = uploadRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    await logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      resource: '/api/upload',
      details: { retryAfter: rateLimitResult.retryAfter }
    })
    return NextResponse.json(
      {
        error: 'Limite de requisições excedido. Tente novamente mais tarde.',
        retryAfter: rateLimitResult.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': rateLimitResult.retryAfter?.toString() || '900' }
      }
    )
  }

  // Verificar autenticação obrigatória
  const user = await auth()
  if (!user) {
    await logSecurityEvent({
      action: 'AUTH_FAILURE',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
      resource: '/api/upload',
      details: { reason: 'no_session' }
    })
    return NextResponse.json(
      { error: 'Autenticação obrigatória' },
      { status: 401 }
    )
  }
  // Usar /tmp para Vercel (serverless) - arquivos são temporários mas funcionam
  const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/uploads' : join(process.cwd(), 'public', 'uploads')
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo - compatibilidade com Vercel
    if (file.size >= uploadConfig.maxFileSize) {
      await logSecurityEvent({
        action: 'FILE_TOO_LARGE',
        ip,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        resource: '/api/upload',
        details: { fileSize: file.size, maxSize: uploadConfig.maxFileSize, fileName: file.name }
      })
      return NextResponse.json(
        { error: getFileTooLargeError(file.size, uploadConfig) },
        { status: 400 }
      )
    }

    // Warning em desenvolvimento se arquivo se aproxima do limite de produção
    if (process.env.NODE_ENV === 'development' && file.size > 1.5 * 1024) { // > 1.5KB
      console.warn(`[UPLOAD WARNING] Arquivo de ${file.size} bytes se aproxima do limite de produção (2KB). Considere otimizar para compatibilidade com Vercel.`)
    }

    // Validar tipo de arquivo
    if (!isMimeTypeAllowed(file.type, uploadConfig)) {
      await logSecurityEvent({
        action: 'INVALID_FILE_TYPE',
        ip,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: user.id,
        resource: '/api/upload',
        details: { fileType: file.type, fileName: file.name, allowedTypes: uploadConfig.allowedMimeTypes }
      })
      return NextResponse.json(
        { error: 'Somente arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    await mkdir(UPLOAD_DIR, { recursive: true })

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = `${randomUUID()}.${fileExtension}`
    const filePath = join(UPLOAD_DIR, fileName)

    // Salvar arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Atualizar métricas de upload
    await prisma.adminMetrics.upsert({
      where: { id: 'singleton' },
      update: { totalUploadBytes: { increment: BigInt(file.size) } },
      create: { id: 'singleton', totalUploadBytes: BigInt(file.size) }
    })

    // Retornar URL do arquivo com data de upload
    // Em produção (Vercel), usar URL relativa já que arquivos são servidos via API
    const fileUrl = process.env.NODE_ENV === 'production'
      ? `/api/uploads/${fileName}` // Servir via API route na Vercel
      : `/uploads/${fileName}` // Servir diretamente do public na versão local

    const uploadDate = new Date().toISOString() // ISO-8601 completo

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      uploadDate: uploadDate,
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
