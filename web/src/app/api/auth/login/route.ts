import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      include: { emissorInfo: true },
    })

    // 1. Usuário não existe
    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // 2. BLOQUEIA LOGIN SE E-MAIL NÃO FOI VERIFICADO (exceto para labor@omni.com e admin@omni.com)
    if (!user.emailVerified && !['labor@omni.com', 'admin@omni.com'].includes(normalizedEmail)) {
      return NextResponse.json(
        {
          error: 'Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada (e spam).',
        },
        { status: 403 } // 403 = Proibido (melhor que 401 aqui)
      )
    }

    // 3. Senha incorreta
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    // 4. Role não permitido
    const allowedRoles = ['RECEPTOR', 'EMISSOR', 'ADMIN'] as const
    if (!allowedRoles.includes(user.role as any)) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    // Tudo certo → cria sessão
    const { password: _, ...userWithoutPassword } = user
    const sessionValue = `${user.id}:${user.role}`
    const response = NextResponse.json({ user: userWithoutPassword }, { status: 200 })

    response.headers.set(
      'Set-Cookie',
      `kairos_imob_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`
    )

    return response
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
