import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { NextResponse, NextRequest } from 'next/server'

// GET /api/reports - Listar laudos (enviados ou recebidos, dependendo do tipo de usuário)
export async function GET(request: Request) {
  try {
    const user = await auth()
    if (!user) {
      console.log('[GET /api/reports] Usuário não autenticado')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const url = request.url.startsWith('http') ? new URL(request.url) : new URL(request.url, 'http://localhost')
    const searchParams = url.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where = user.role === 'EMISSOR'
      ? { senderId: user.id }
      : { receiverId: user.id }

    console.log('[GET /api/reports] user:', user)
    console.log('[GET /api/reports] where:', where)
    console.log('[GET /api/reports] page:', page, 'limit:', limit, 'skip:', skip)

    const reports = await prisma.report.findMany({
      where,
      include: {
        sender: {
          select: {
            name: true,
            emissorInfo: true
          }
        },
        receiver: {
          select: {
            name: true,
            cpf: true
          }
        },
        notification: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      },
      skip,
      take: limit
    })

    console.log('[GET /api/reports] reports encontrados:', reports.length)
    if (reports.length > 0) {
      console.log('[GET /api/reports] Primeiro report:', JSON.stringify(reports[0], null, 2))
    }

    // Contar total de registros para paginação
    const total = await prisma.report.count({ where })
    console.log('[GET /api/reports] total:', total)

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[GET] /api/reports:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar laudos' },
      { status: 500 }
    )
  }
}

// POST /api/reports - Criar novo laudo (apenas para emissores)
export async function POST(request: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é um emissor
    if (user.role !== 'EMISSOR') {
      return NextResponse.json(
        { error: 'Apenas emissores podem enviar laudos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, fileName, fileUrl, receiverId } = body

    // Gerar número de protocolo único (ANO + sequencial)
    const currentYear = new Date().getFullYear()
    const lastReport = await prisma.report.findFirst({
      where: {
        protocol: {
          startsWith: currentYear.toString()
        }
      },
      orderBy: {
        protocol: 'desc'
      }
    })

    let sequence = 1
    if (lastReport) {
      sequence = parseInt(lastReport.protocol.split('-')[1]) + 1
    }
    const protocol = `${currentYear}-${sequence.toString().padStart(5, '0')}`

    // Criar o laudo
    const report = await prisma.report.create({
      data: {
        protocol,
        title,
        fileName,
        fileUrl,
        senderId: user.id,
        receiverId,
        status: 'SENT'
      },
      include: {
        sender: {
          select: {
            name: true,
            emissorInfo: true
          }
        },
        receiver: {
          select: {
            name: true,
            cpf: true
          }
        }
      }
    })

    // Criar notificação para o receptor
    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'LAB_RESULT',
        payload: {
          reportId: report.id,
          title: report.title,
          protocol: report.protocol
        },
        status: 'UNREAD'
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('[POST] /api/reports:', error)
    return NextResponse.json(
      { error: 'Erro ao criar laudo' },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/:id/status - Atualizar status do laudo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{}> }
) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params as { id: string }
    const body = await request.json()
    const { status } = body

    // Verificar se o usuário tem acesso ao laudo
    const report = await prisma.report.findUnique({
      where: { id },
      include: { notification: true }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Laudo não encontrado' },
        { status: 404 }
      )
    }

    if (report.receiverId !== user.id && report.senderId !== user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Atualizar status e timestamps
    const updateData: any = { status }
    if (status === 'RECEIVED') {
      updateData.receivedAt = new Date()
      console.log('[PATCH] Atualizando receivedAt para:', updateData.receivedAt)
    } else if (status === 'VIEWED') {
      updateData.viewedAt = new Date()
      console.log('[PATCH] Atualizando viewedAt para:', updateData.viewedAt)
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: {
            name: true,
            emissorInfo: true
          }
        },
        receiver: {
          select: {
            name: true,
            cpf: true
          }
        }
      }
    })

    // Se o status for VIEWED, atualizar também a notificação
    if (status === 'VIEWED' && report.notification) {
      await prisma.notification.update({
        where: { id: report.notification.id },
        data: { status: 'READ' }
      })
    }

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error('[PATCH] /api/reports/:id/status:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status do laudo' },
      { status: 500 }
    )
  }
}
