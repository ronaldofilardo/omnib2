import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import type { HealthEvent, FileInfo } from '@/types/events'

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { slot } = await req.json()

    // Buscar evento para obter informações do arquivo
    const event = await prisma.healthEvent.findUnique({
      where: { id },
      select: { files: true }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Garantir que files é um array
    // Parse os arquivos do JSON
    let files: FileInfo[] = [];
    try {
      files = JSON.parse(event.files as string || '[]') as FileInfo[];
    } catch (err) {
      console.error('[Delete File] Erro ao fazer parse dos arquivos:', event.files, err);
      return NextResponse.json({ error: 'Erro ao processar arquivos do evento' }, { status: 500 });
    }

    // Encontrar arquivo a ser deletado
    const file = files.find(f => f.slot === slot);
    if (!file) {
      console.error('[Delete File] Arquivo não encontrado para slot:', slot, 'em', files);
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }

    // Remover arquivo do sistema de arquivos
    const filePath = join(process.cwd(), 'public', file.url);
    try {
      await unlink(filePath);
    } catch (err) {
      // Se o arquivo já não existe, logar mas não falhar
      console.warn('[Delete File] Arquivo já não existe ou erro ao deletar:', filePath, err);
    }

    // Atualizar evento removendo o arquivo
    const updatedFiles = files.filter(f => f.slot !== slot);
    await prisma.healthEvent.update({
      where: { id },
      data: { files: JSON.stringify(updatedFiles) }
    });

    console.log('[Delete File] Arquivo deletado com sucesso:', filePath, 'para slot:', slot);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Delete File] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar arquivo' },
      { status: 500 }
    )
  }
}