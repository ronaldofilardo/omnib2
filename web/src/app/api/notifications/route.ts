import { NextRequest, NextResponse } from 'next/server';
import { NotificationStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await auth();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userId = user.id;

  // Busca notificações UNREAD ou ARCHIVED para o usuário
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      status: { in: [NotificationStatus.UNREAD, NotificationStatus.ARCHIVED] }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`[GET /api/notifications] Encontradas ${notifications.length} notificações UNREAD para userId: ${userId}`);
  if (notifications.length > 0) {
    console.log('[GET /api/notifications] Primeira notificação:', JSON.stringify(notifications[0], null, 2));
  }

  return NextResponse.json(notifications, { status: 200 });
}
