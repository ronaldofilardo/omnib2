import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost');
  const userId = url.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  // Busca notificações UNREAD para o usuário
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      status: NotificationStatus.UNREAD
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`[GET /api/notifications] Encontradas ${notifications.length} notificações UNREAD para userId: ${userId}`);
  if (notifications.length > 0) {
    console.log('[GET /api/notifications] Primeira notificação:', JSON.stringify(notifications[0], null, 2));
  }

  return NextResponse.json(notifications, { status: 200 });
}
