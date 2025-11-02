
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const slot = formData.get('slot') as string
    const eventId = formData.get('eventId') as string

    if (!file || !slot || !eventId) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    // Salvar arquivo localmente (exemplo)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', eventId)
    await fs.mkdir(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, `${slot}-${file.name}`)
    await fs.writeFile(filePath, buffer)

    // Retornar URL do arquivo salvo
    const fileUrl = `/uploads/${eventId}/${slot}-${file.name}`

    // Atualizar o campo files do evento no banco
    // Busca os arquivos atuais
    const event = await prisma.healthEvent.findUnique({ where: { id: eventId } })
    let filesArr: any[] = []
    if (event && Array.isArray(event.files)) {
      filesArr = event.files
    } else if (event && typeof event.files === 'string') {
      try {
        filesArr = JSON.parse(event.files)
      } catch { filesArr = [] }
    }
    // Remove arquivo antigo do mesmo slot, se houver
    filesArr = filesArr.filter((f: any) => f.slot !== slot)
    // Adiciona novo arquivo
    filesArr.push({
      slot,
      name: file.name,
      url: fileUrl,
      uploadDate: new Date().toISOString().split('T')[0],
    })
    // Atualiza no banco
    await prisma.healthEvent.update({
      where: { id: eventId },
      data: { files: filesArr },
    })

    return NextResponse.json({ success: true, url: fileUrl, name: file.name })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
