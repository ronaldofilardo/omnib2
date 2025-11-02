import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function globalSetup() {
  // Limpa o banco de dados
  await prisma.healthEvent.deleteMany()
  await prisma.professional.deleteMany()
  await prisma.user.deleteMany()

  // Cria usuário de teste
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: '$2a$10$VBb3iRxGYh1yQb66JCzKvuoM2AZwbZk0F4f5F4f5F4f5F4f5F4f5F4', // password123
      name: 'Usuário Teste',
      cpf: '12345678901', // CPF obrigatório
    }
  })

  // Cria profissionais de teste
  await prisma.professional.create({
    data: {
      name: 'Dr. João',
      specialty: 'Psicologia',
      contact: 'joao@example.com',
      userId: user.id
    }
  })
  await prisma.professional.create({
    data: {
      name: 'Dra. Ana',
      specialty: 'Nutrição',
      contact: 'ana@example.com',
      userId: user.id
    }
  })

  await prisma.$disconnect()
}