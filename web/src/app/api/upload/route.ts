import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Configurações de upload para MVP (máximo 2KB)
const MAX_FILE_SIZE = 2 * 1024 // 2048 bytes = 2KB

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]

// Pasta para armazenar uploads
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')



export async function POST(req: NextRequest) {
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

    // Validar tamanho do arquivo (máximo 2KB para MVP)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo deve ter no máximo ${MAX_FILE_SIZE / 1024}KB. Tamanho atual: ${(file.size / 1024).toFixed(1)}KB` },
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

    // Retornar URL do arquivo com data de upload
    // Em produção (Vercel), usar URL relativa já que arquivos são servidos via API
    const fileUrl = process.env.NODE_ENV === 'production'
      ? `/api/uploads/${fileName}` // Servir via API route na Vercel
      : `/uploads/${fileName}` // Servir diretamente do public na versão local

    const uploadDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD em UTC

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
