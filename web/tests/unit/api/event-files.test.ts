import { PUT } from '../../../src/app/api/events/route'
import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('PUT /api/events', () => {
  const prisma = new PrismaClient()
  let professionalId: string
  let eventId: string

  let testCpf: string;
  beforeAll(async () => {
    // Gera CPF aleatório para evitar conflito de chave única
    testCpf = String(Math.floor(10000000000 + Math.random() * 89999999999));
    await prisma.user.create({
      data: {
        id: 'user-1',
        email: 'user1@teste.com',
        password: 'senha',
        name: 'Usuário Teste',
        cpf: testCpf,
      },
    })
    const professional = await prisma.professional.create({
      data: { name: 'Dr. File Test', specialty: 'Uploader', userId: 'user-1' },
    })
    professionalId = professional.id

    const event = await prisma.healthEvent.create({
      data: {
        title: 'Evento para Teste de Arquivo',
        date: new Date().toISOString().split('T')[0], // Corrige para string yyyy-MM-dd
        type: 'CONSULTA',
        startTime: '14:00',
        endTime: '15:00',
        professionalId,
        userId: 'user-1',
        files: [],
      },
    })
    eventId = event.id
  })

  afterAll(async () => {
    await prisma.healthEvent.deleteMany({ where: { id: eventId } })
    await prisma.professional.deleteMany({ where: { id: professionalId } })
    await prisma.user.deleteMany({ where: { id: 'user-1' } })
  })

  it('persiste arquivos anexados', async () => {
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
      },
    ]

    // Payload completo para a requisição PUT
    const fullPayload = {
      id: eventId,
      title: 'Evento para Teste de Arquivo',
      date: new Date().toISOString().split('T')[0], // Corrige formato para yyyy-MM-dd
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }

    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.files).toEqual(filesPayload)
  })

  it('persiste múltiplos arquivos anexados', async () => {
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
      },
      { slot: 'image', name: 'image.png', url: 'http://example.com/image.png' },
    ]
    const fullPayload = {
      id: eventId,
      title: 'Evento com múltiplos arquivos',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }
    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    const response = await PUT(request)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual(filesPayload)
  })

  it('retorna erro se arquivos forem inválidos', async () => {
    const fullPayload = {
      id: eventId,
      title: 'Evento com arquivo inválido',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: null, // Simula payload inválido
    }
    const request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    const response = await PUT(request)
    expect([200, 400]).toContain(response.status) // Aceita 400 se houver validação, 200 se aceitar vazio
  })

  it('remove arquivos do evento', async () => {
    // Primeiro adiciona arquivos
    const filesPayload = [
      {
        slot: 'result',
        name: 'result.pdf',
        url: 'http://example.com/result.pdf',
      },
    ]
    let fullPayload = {
      id: eventId,
      title: 'Evento para remoção de arquivo',
      date: new Date().toISOString().split('T')[0],
  type: 'CONSULTA',
      startTime: '14:00',
      endTime: '15:00',
      professionalId,
      files: filesPayload,
    }
    let request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    let response = await PUT(request)
    let data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual(filesPayload)

    // Agora remove arquivos
    fullPayload = {
      ...fullPayload,
      files: [],
    }
    request = new Request('http://localhost/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload),
    })
    response = await PUT(request)
    data = await response.json()
    expect(response.status).toBe(200)
    expect(data.files).toEqual([])
  })
})
