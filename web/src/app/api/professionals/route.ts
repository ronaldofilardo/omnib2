import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Usuário padrão
const DEFAULT_USER_EMAIL = 'user@email.com'

async function getDefaultUserId() {
  const user = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  })
  if (!user) throw new Error('Usuário padrão não encontrado.')
  return user.id
}

async function GET_SPECIALTIES() {
  try {
    const userId = await getDefaultUserId()
    const professionals = await prisma.professional.findMany({
      where: { userId },
    })
    const specialties = Array.from(
      new Set(
        professionals
          .map((p) => p.specialty)
          .filter((s) => s && s !== 'A ser definido')
      )
    )
    return NextResponse.json(specialties)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const userId = body.userId || await getDefaultUserId()
    const { id, name, specialty, address, contact } = body
    if (!id || !name || !specialty) {
      return NextResponse.json(
        { error: 'ID, nome e especialidade são obrigatórios.' },
        { status: 400 }
      )
    }
    const professional = await prisma.professional.update({
      where: {
        id,
        userId, // Garante que o profissional pertence ao usuário
      },
      data: { name, specialty, address, contact },
    })
    return NextResponse.json(professional)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  // Garante que a URL seja absoluta
  const url = request.url.startsWith('http') ? new URL(request.url) : new URL(request.url, 'http://localhost')
  const type = url.searchParams.get('type')

  if (type === 'specialties') {
    return GET_SPECIALTIES()
  }

  try {
    const userId = url.searchParams.get('userId') || await getDefaultUserId()
    const professionals = await prisma.professional.findMany({
      where: { userId },
    })
    return NextResponse.json(professionals)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const userId = body.userId || await getDefaultUserId()
    let { name, specialty, address, contact } = body
    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório.' },
        { status: 400 }
      )
    }
    if (!specialty) {
      specialty = 'A ser definido'
    }
    const professional = await prisma.professional.create({
      data: { name, specialty, address, contact, userId },
    })
    return NextResponse.json(professional, { status: 201 })
  } catch (error) {
    // Log detalhado para debug
    console.error('Erro ao criar profissional:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    // Garante que a URL seja absoluta
    const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost')
    const id = url.searchParams.get('id')
    const userId = url.searchParams.get('userId') || await getDefaultUserId()
    if (!id) {
      return NextResponse.json(
        { error: 'ID do profissional é obrigatório.' },
        { status: 400 }
      )
    }
    await prisma.professional.delete({
      where: {
        id,
        userId,
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
