import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/notifications/:id - Atualizar status da notificação
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { status: status as NotificationStatus }
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('[PATCH] /api/notifications/:id:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar notificação' },
      { status: 500 }
    );
  }
}