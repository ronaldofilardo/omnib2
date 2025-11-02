
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    console.log('[API Repository] Iniciando busca...')
    const url = request.url.startsWith('http') ? new URL(request.url) : new URL(request.url, 'http://localhost');
    const userId = url.searchParams.get('userId');
    console.log('[API Repository] userId recebido:', userId)
    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
    }

    // Busca todos os eventos do usuário, com ou sem arquivos
    const events = await prisma.healthEvent.findMany({
      where: { userId },
      include: { professional: true },
      orderBy: { date: 'desc' },
    });

    // Garante que files está sempre como array
    const eventsFormatted = events.map(event => ({
      ...event,
      files: typeof event.files === 'string' ? JSON.parse(event.files) : event.files
    }));

    console.log('[API Repository] Eventos retornados:', eventsFormatted.length)
    return NextResponse.json(eventsFormatted);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API Repository] Erro ao buscar eventos com arquivos:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
    return NextResponse.json({ error: 'Erro interno ao buscar dados do repositório.' }, { status: 500 });
  }
}

