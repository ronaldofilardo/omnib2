import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      name, 
      cpf, 
      telefone,
      role = 'RECEPTOR', // Default para RECEPTOR
      emissorInfo // Informações adicionais para emissores
    } = await request.json()

    if (!email || !password || !cpf) {
      return NextResponse.json(
        { error: 'Email, senha e CPF são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar CPF: deve ter 11 dígitos
    const cpfNumbers = cpf.replace(/\D/g, '')
    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      )
    }

    // No MVP, não permitir registro direto de emissores
    if (role === 'EMISSOR') {
      return NextResponse.json(
        { error: 'Registro de emissores não disponível' },
        { status: 403 }
      )
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Usuário já existe' }, { status: 400 })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Verificar se CPF já existe (usando findFirst pois cpf não é único)
    const cpfClean = cpf.replace(/\D/g, '');
    const existingCPF = await prisma.user.findFirst({
      where: {
        cpf: {
          in: [cpf, cpfClean] // Busca tanto com quanto sem formatação
        }
      }
    })

    if (existingCPF) {
      return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 400 })
    }

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        cpf,
        telefone,
        role, // Sempre será 'RECEPTOR' no MVP
      },
    })

    // Retornar usuário sem senha
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
