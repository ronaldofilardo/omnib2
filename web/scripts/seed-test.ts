import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...')

  // Criar usuário padrão de teste
  const hashedPassword = await bcrypt.hash('1234', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@email.com' },
    update: {},
    create: {
      email: 'user@email.com',
      password: hashedPassword,
      name: 'Usuário Padrão',
      cpf: '12345678901', // CPF obrigatório
    },
  })
  console.log('✅ Usuário criado:', user.email)

  // Criar profissionais de exemplo
  const professionals = [
    {
      name: 'Dr. João Silva',
      specialty: 'Cardiologia',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
      contact: '(11) 99999-0001',
    },
    {
      name: 'Dra. Maria Santos',
      specialty: 'Dermatologia',
      address: 'Rua Augusta, 500 - São Paulo/SP',
      contact: '(11) 99999-0002',
    },
    {
      name: 'Dr. Pedro Oliveira',
      specialty: 'Ortopedia',
      address: 'Av. Brigadeiro Faria Lima, 2000 - São Paulo/SP',
      contact: '(11) 99999-0003',
    },
  ]

  for (const prof of professionals) {
    const professional = await prisma.professional.create({
      data: {
        ...prof,
        userId: user.id,
      },
    })
    console.log('✅ Profissional criado:', professional.name)
  }

  // Criar eventos de exemplo
  const events = [
    {
      title: 'Consulta de Rotina',
      description: 'Check-up anual de saúde cardiovascular',
      date: '2024-12-20',
      startTime: '09:00',
      endTime: '10:00',
      type: 'CONSULTA' as const,
      professionalId: (await prisma.professional.findFirst({
        where: { name: 'Dr. João Silva' },
      }))!.id,
    },
    {
      title: 'Exame Dermatológico',
      description: 'Avaliação de pele e possíveis alergias',
      date: '2024-12-22',
      startTime: '14:00',
      endTime: '15:00',
      type: 'EXAME' as const,
      professionalId: (await prisma.professional.findFirst({
        where: { name: 'Dra. Maria Santos' },
      }))!.id,
    },
  ]

  for (const event of events) {
    const healthEvent = await prisma.healthEvent.create({
      data: {
        ...event,
        userId: user.id,
        files: [],
      },
    })
    console.log('✅ Evento criado:', healthEvent.title)
  }

  console.log('🎉 Seed de dados de teste concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
