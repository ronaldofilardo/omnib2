import { NextResponse } from 'next/server'
import { EventType, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { logDocumentSubmission } from '@/lib/services/auditService'
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer'
import {
  validateDate,
  validateStartTime,
  validateEndTime,
  validateEventDateTime,
} from '@/lib/validators/eventValidators'
import fs from 'fs'
import { promises as fsPromises } from 'fs'
import path from 'path'
import { createJsonResponse } from '@/lib/json-serializer'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function PUT(req: Request) {
  type UpdateEventBody = {
    id: string
    title: string
    description?: string
    observation?: string
    date: string
    type: EventType
    startTime: string
    endTime: string
    professionalId: string
    files?: any
    notificationId?: string
  }
  let body: UpdateEventBody | undefined = undefined
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    body = await req.json()
    const {
      id,
      title,
      description,
      date,
      type,
      startTime,
      endTime,
      professionalId,
      files,
      notificationId,
    } = body as UpdateEventBody

    // Determinar se é atualização apenas de arquivos (não requer campos do evento)
    const isFileOnlyUpdate = files && !title && !date && !type && !professionalId

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Para atualizações completas do evento, validar campos obrigatórios
    if (!isFileOnlyUpdate) {
      if (
        !title ||
        !date ||
        !type ||
        (!notificationId && (!startTime || !endTime)) ||
        !professionalId
      ) {
        console.warn(
          `[API Events] Campos obrigatórios ausentes para atualização completa:`,
          {
            id,
            title,
            date,
            type,
            startTime: startTime || 'não fornecido',
            endTime: endTime || 'não fornecido',
            professionalId,
            notificationId,
          }
        )
        return NextResponse.json(
          { error: 'Campos obrigatórios ausentes' },
          { status: 400 }
        )
      }
    }

    // Validar data e horários apenas se fornecidos e não for atualização apenas de arquivos
    if (!isFileOnlyUpdate && startTime && endTime) {
      const validation = validateEventDateTime(date, startTime, endTime)
      if (!validation.isValid) {
        const errorMessages = Object.values(validation.errors).join(' ')
        console.warn(
          `[API Events] Validação falhou na atualização:`,
          validation.errors
        )
        return NextResponse.json(
          { error: errorMessages || 'Dados inválidos' },
          { status: 400 }
        )
      }
    }

    // Processar datas e horários apenas se NÃO for atualização apenas de arquivos
    let utcDate: string | undefined;
    let startDateTime: Date | undefined;
    let endDateTime: Date | undefined;

    if (!isFileOnlyUpdate) {
      // Se notificationId for fornecido, estamos apenas associando notificação
      // Nesse caso, não fazer conversão de fuso horário pois a data já está correta
      if (notificationId) {
        utcDate = date; // Usar data como recebida, sem conversão de fuso
      } else {
        // Para criação/edição normal, fazer conversão de fuso horário
        if (!date) {
          return NextResponse.json(
            { error: 'Data é obrigatória para atualização completa do evento' },
            { status: 400 }
          )
        }
        const localDate = new Date(`${date}T12:00:00`) // Meio dia para evitar problemas de timezone
        utcDate = localDate.toISOString().split('T')[0] // YYYY-MM-DD em UTC
      }

      // Converter horários para Date objects apenas se fornecidos
      if (startTime && endTime) {
        const [year, month, day] = date.split('-').map(Number);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        startDateTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
        endDateTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
      }

      // Verificar sobreposição de eventos apenas se horários foram fornecidos
      if (startDateTime && endDateTime) {
        let overlappingEvents = []
        try {
          overlappingEvents = (await prisma.healthEvent.findMany({
            where: {
              professionalId,
              date: new Date(utcDate!),
              id: { not: id }, // Excluir o evento atual da verificação
              AND: [
                {
                  startTime: { lte: endDateTime },
                },
                {
                  endTime: { gte: startDateTime },
                },
              ],
            },
          })) || []
        } catch (error) {
          console.warn('[API Events] Erro ao verificar sobreposição:', error)
          overlappingEvents = []
        }
        if (overlappingEvents.length > 0) {
          return NextResponse.json(
            { error: 'Já existe um evento para este profissional neste horário (sobreposição).' },
            { status: 400 }
          )
        }
      }
    }

    // Se notificationId for fornecido, atualizar evento e arquivar notificação em transação
    if (notificationId) {
      const overwrite = req.headers.get('x-overwrite-result') === 'true';
      const slot = req.headers.get('x-slot') || 'result';
      const result = await prisma.$transaction(async (tx) => {
        // Buscar evento existente com arquivos
        const existing = await tx.healthEvent.findUnique({
          where: { id, userId },
          include: { files: true }
        })
        if (!existing) {
          throw new Error('Evento não encontrado')
        }
        // Verificar se já existe arquivo no slot especificado
        const filesArr = Array.isArray(files) ? files : [];
        const alreadyHasFileInSlot = existing.files.some((f) => f.slot === slot);
        if (alreadyHasFileInSlot && !overwrite) {
          const slotNames = { request: 'solicitação', authorization: 'autorização', certificate: 'atestado', result: 'laudo', prescription: 'prescrição', invoice: 'nota fiscal' };
          const slotName = slotNames[slot as keyof typeof slotNames] || slot;
          return { conflict: true, message: `Já existe um ${slotName} para este evento. Deseja sobrescrever?` };
        }
        // Deletar apenas arquivo do slot correspondente (ex: laudo)
        await tx.files.deleteMany({ where: { eventId: id, slot } });
        // Atualizar evento - apenas campos fornecidos
        const updateData: any = {
          title,
          description,
          // Para associação de notificação, preservar a data existente do evento
          // Não fazer conversão de timezone para evitar shift de data
          date: existing.date,
          type,
          professionalId,
        };
        
        // Só incluir horários se foram fornecidos
        if (startTime && endTime) {
          updateData.startTime = new Date(`${utcDate}T${startTime}:00Z`);
          updateData.endTime = new Date(`${utcDate}T${endTime}:00Z`);
        }
        
        const event = await tx.healthEvent.update({
          where: { id, userId },
          data: updateData,
        });
        // Criar novo arquivo apenas se houver arquivo para o slot
        if (filesArr.length > 0) {
          const slotFiles = filesArr.filter(f => f.slot === slot);
          if (slotFiles.length > 0) {
            const createdFiles = await tx.files.createMany({
              data: slotFiles.map((f: any) => ({
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID(),
                eventId: id,
                professionalId,
                slot: f.slot,
                name: f.name,
                url: f.url,
                physicalPath: f.physicalPath,
                uploadDate: f.uploadDate,
                expiryDate: f.expiryDate,
              })),
            });
            // Salvar arquivos fisicamente se content presente
            for (const f of slotFiles) {
              if (f.content) {
                try {
                  const buffer = Buffer.from(f.content, 'base64')
                  const uploadDir = path.join(process.cwd(), 'public', 'uploads', id.toString())
                  await fsPromises.mkdir(uploadDir, { recursive: true })
                  const filePath = path.join(uploadDir, `${f.slot}-${f.name}`)
                  await fsPromises.writeFile(filePath, buffer)
                  
                  // Calcular hash SHA-256 do arquivo
                  const fileHash = calculateFileHashFromBase64(f.content);
                  
                  // Buscar dados completos do usuário para o CPF
                  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
                  
                  // Registrar no audit log
                  await logDocumentSubmission({
                    origin: 'PORTAL_LOGADO',
                    receiverCpf: fullUser?.cpf?.replace(/\D/g, '') || 'desconhecido',
                    patientId: user.id,
                    patientName: user.name || null,
                    fileName: f.name,
                    fileHash: fileHash,
                    protocol: null,
                    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'portal-interno',
                    userAgent: req.headers.get('user-agent') || null,
                    status: 'SUCCESS',
                  });
                } catch (fileError) {
                  throw fileError
                }
              }
            }
          }
        }
        await tx.notification.update({
          where: { id: notificationId },
          data: { status: 'ARCHIVED' },
        });

        // Retornar evento com arquivos incluídos
        const eventWithFiles = await tx.healthEvent.findUnique({
          where: { id, userId },
          include: { files: true }
        });
        return eventWithFiles;
      });
      if (result && (result as any).conflict) {
        return NextResponse.json({ warning: (result as any).message }, { status: 409 });
      }
      if ((result as any)?.id) {
        console.log(`[API Events] Evento atualizado e notificação arquivada: ${(result as any).id}`)
      }
      return NextResponse.json(result, { status: 200 })
    } else {
      // Verificar se é atualização apenas de arquivos
      if (isFileOnlyUpdate) {
        console.log(`[API Events] Atualização apenas de arquivos para evento: ${id}`)

        // Buscar evento existente para obter professionalId
        const existingEvent = await prisma.healthEvent.findUnique({
          where: { id, userId },
          select: { professionalId: true }
        })

        if (!existingEvent) {
          return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
        }

        // Processar arquivos (criar novos, substituir existentes por slot)
        const filesArr = Array.isArray(files) ? files : [];
        if (filesArr.length > 0) {
          // Primeiro, deletar arquivos existentes dos slots que serão atualizados
          const slotsToUpdate = [...new Set(filesArr.map((f: any) => f.slot))];
          
          if (slotsToUpdate.length > 0) {
            console.log(`[API Events] Deletando arquivos órfãos dos slots: ${slotsToUpdate.join(', ')}`);
            await prisma.files.deleteMany({
              where: {
                eventId: id,
                slot: { in: slotsToUpdate }
              }
            });
          }

          await prisma.files.createMany({
            data: filesArr.map((f: any) => {
              let uploadDate: Date | null = null;
              let expiryDate: Date | null = null;

              try {
                uploadDate = f.uploadDate ? new Date(f.uploadDate) : null;
                // Validar se a data é válida
                if (uploadDate && isNaN(uploadDate.getTime())) {
                  uploadDate = null;
                }
              } catch {
                uploadDate = null;
              }

              try {
                expiryDate = f.expiryDate ? new Date(f.expiryDate) : null;
                // Validar se a data é válida
                if (expiryDate && isNaN(expiryDate.getTime())) {
                  expiryDate = null;
                }
              } catch {
                expiryDate = null;
              }

              return {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID(),
                eventId: id,
                professionalId: existingEvent.professionalId,
                slot: f.slot,
                name: f.name,
                url: f.url,
                physicalPath: f.physicalPath,
                uploadDate,
                expiryDate,
              };
            }),
          })

          // Salvar arquivos fisicamente se content presente
          for (const f of filesArr) {
            if (f.content) {
              console.log(`[API Events] Salvando arquivo: ${f.name} no slot ${f.slot} para evento ${id}`)
              try {
                const buffer = Buffer.from(f.content, 'base64')
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', id.toString())
                await fsPromises.mkdir(uploadDir, { recursive: true })
                const filePath = path.join(uploadDir, `${f.slot}-${f.name}`)
                await fsPromises.writeFile(filePath, buffer)
                console.log(`[API Events] Arquivo salvo com sucesso: ${filePath}`)
              } catch (fileError) {
                console.error(`[API Events] Erro ao salvar arquivo ${f.name}:`, fileError)
                throw fileError
              }
            }
          }
        }

        // Retornar evento com arquivos incluídos (dados originais preservados)
        const eventWithFiles = await prisma.healthEvent.findUnique({
          where: { id, userId },
          include: { files: true }
        });

        console.log(`[API Events] Arquivos adicionados ao evento: ${id}`)
        return createJsonResponse(eventWithFiles, { status: 200 })

      } else {
        // Atualização completa do evento (lógica original)
        // Verificar se utcDate foi definido (deve ter sido no bloco if (!isFileOnlyUpdate))
        if (!utcDate) {
          return NextResponse.json(
            { error: 'Erro interno: data não foi processada corretamente' },
            { status: 500 }
          )
        }
        // Deletar arquivos existentes
        await prisma.files.deleteMany({ where: { eventId: id } });
        // Atualizar evento
        const event = await prisma.healthEvent.update({
          where: { id, userId },
          data: {
            title,
            description,
            date: new Date(utcDate),
            startTime: new Date(`${utcDate}T${startTime}:00Z`),
            endTime: new Date(`${utcDate}T${endTime}:00Z`),
            type,
            professionalId,
          },
        })
        // Criar novos arquivos
        const filesArr = Array.isArray(files) ? files : [];
        if (filesArr.length > 0) {
          await prisma.files.createMany({
            data: filesArr.map((f: any) => {
              let uploadDate: Date | null = null;
              let expiryDate: Date | null = null;

              try {
                uploadDate = f.uploadDate ? new Date(f.uploadDate) : null;
                // Validar se a data é válida
                if (uploadDate && isNaN(uploadDate.getTime())) {
                  uploadDate = null;
                }
              } catch {
                uploadDate = null;
              }

              try {
                expiryDate = f.expiryDate ? new Date(f.expiryDate) : null;
                // Validar se a data é válida
                if (expiryDate && isNaN(expiryDate.getTime())) {
                  expiryDate = null;
                }
              } catch {
                expiryDate = null;
              }

              return {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID(),
                eventId: id,
                professionalId,
                slot: f.slot,
                name: f.name,
                url: f.url,
                physicalPath: f.physicalPath,
                uploadDate,
                expiryDate,
              };
            }),
          })

          // Salvar arquivos fisicamente se content presente
          for (const f of filesArr) {
            if (f.content) {
              console.log(`[API Events] Salvando arquivo: ${f.name} no slot ${f.slot} para evento ${id}`)
              try {
                const buffer = Buffer.from(f.content, 'base64')
                const uploadDir = path.join(process.cwd(), 'public', 'uploads', id.toString())
                await fsPromises.mkdir(uploadDir, { recursive: true })
                const filePath = path.join(uploadDir, `${f.slot}-${f.name}`)
                await fsPromises.writeFile(filePath, buffer)
                console.log(`[API Events] Arquivo salvo com sucesso: ${filePath}`)
              } catch (fileError) {
                console.error(`[API Events] Erro ao salvar arquivo ${f.name}:`, fileError)
                throw fileError
              }
            }
          }
        }

        // Retornar evento com arquivos incluídos
        const eventWithFiles = await prisma.healthEvent.findUnique({
          where: { id, userId },
          include: { files: true }
        });

        if (!eventWithFiles) {
          throw new Error('Evento não encontrado após atualização')
        }

        console.log(`[API Events] Evento atualizado com sucesso: ${eventWithFiles.id}`)
        return createJsonResponse(eventWithFiles, { status: 200 })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao atualizar evento:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestData: body || null,
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao atualizar evento',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}

const DEFAULT_USER_EMAIL = 'user@email.com'


// Função utilitária para obter userId do query param
function getUserIdFromUrl(req: Request): string | null {
  try {
    // Se req.url não for absoluta, adiciona um base
    const url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, 'http://localhost')
    const userId = url.searchParams.get('userId')
    return userId || null
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id

    // Extrair parâmetros de paginação
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '20'))) // Máx 1000, default 20
    const offset = (page - 1) * limit

    console.log(`[API Events] Buscando eventos para usuário: ${userId}, página: ${page}, limite: ${limit}`)

    // Query otimizada com paginação e select limitado
    const [events, totalCount] = await Promise.all([
      prisma.healthEvent.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          description: true,
          date: true,
          type: true,
          startTime: true,
          endTime: true,
          professionalId: true,
          professional: {
            select: {
              id: true,
              name: true,
              specialty: true
            }
          },
          files: {
            select: {
              id: true,
              slot: true,
              name: true,
              url: true,
              uploadDate: true
            },
            where: { isOrphaned: false } // Só arquivos não órfãos
          }
        },
        orderBy: { date: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.healthEvent.count({ where: { userId } })
    ])

    console.log(`[API Events] Encontrados ${events.length} eventos de ${totalCount} total`)

    return createJsonResponse({
      events,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: page > 1
      }
    }, {
      status: 200,
      headers: {
        // Cache mais agressivo para dados paginados
        'Cache-Control': 'private, max-age=300', // 5 minutos
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao buscar eventos:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao buscar eventos',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  type EventBody = {
    title: string
    description?: string
    observation?: string
    date: string
    type: EventType
    startTime: string
    endTime: string
    professionalId: string
    files?: any
    notificationId?: string
  }
  let body: EventBody | undefined = undefined
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    body = await req.json()
    const {
      title,
      description,
      observation,
      date,
      type,
      startTime,
      endTime,
      professionalId,
      files,
      notificationId,
    } = body as EventBody
    console.log(`[API Events] Criando evento para usuário: ${userId}`, {
      title,
      date,
      type,
      notificationId,
    })
    if (!title || !date || !type || !startTime || !endTime || !professionalId) {
      console.warn(`[API Events] Campos obrigatórios ausentes:`, {
        title,
        date,
        type,
        startTime,
        endTime,
        professionalId,
      })
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      )
    }

    // Validar data e horários
    const validation = validateEventDateTime(date, startTime, endTime)
    if (!validation.isValid) {
      const errorMessages = Object.values(validation.errors).join(' ')
      console.warn(`[API Events] Validação falhou:`, validation.errors)
      return NextResponse.json(
        { error: errorMessages || 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Converter data para UTC (assumindo que a data recebida é local)
    const localDate = new Date(`${date}T12:00:00`) // Meio dia para evitar problemas de timezone
    const utcDate = localDate.toISOString().split('T')[0] // YYYY-MM-DD em UTC

    // Validar se o profissional existe
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId }
    });
    if (!professional) {
      console.warn(`[API Events] Profissional não encontrado: ${professionalId}`);
      return NextResponse.json(
        { error: 'Profissional não encontrado. Por favor, selecione um profissional válido.' },
        { status: 400 }
      );
    }

    // Converter horários para Date objects SEM adicionar timezone UTC
    // Usar a data local diretamente para evitar conversão de timezone
    const [year, month, day] = date.split('-').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
    const endDateTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0);
    
    // Verificar sobreposição de eventos para o mesmo profissional, data e horário
    const overlappingEvents = await prisma.healthEvent.findMany({
      where: {
        professionalId,
        date: new Date(utcDate),
        AND: [
          {
            startTime: { lte: endDateTime },
          },
          {
            endTime: { gte: startDateTime },
          },
        ],
      },
    })
    if (overlappingEvents.length > 0) {
      return NextResponse.json(
        { error: 'Já existe um evento para este profissional neste horário (sobreposição).' },
        { status: 400 }
      )
    }

    // Se notificationId for fornecido, criar evento e arquivar notificação em transação
    if (notificationId) {
      // Se não houver observation, usar mensagem padrão na description
      const desc = observation?.trim()
        ? observation
        : 'Laudo enviado pelo app Omni';
      const result = await prisma.$transaction(async (tx) => {
        const event = await tx.healthEvent.create({
          data: {
            title,
            description: desc,
            observation,
            date: new Date(utcDate),
            startTime: startDateTime,
            endTime: endDateTime,
            type,
            userId,
            professionalId,
          },
        })
        // Criar arquivos se fornecidos
        if (files && Array.isArray(files)) {
          await tx.files.createMany({
            data: files.map((f: any) => ({
              id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID(),
              eventId: event.id,
              professionalId,
              slot: f.slot,
              name: f.name,
              url: f.url,
              physicalPath: f.physicalPath,
              uploadDate: f.uploadDate ? new Date(f.uploadDate) : null,
              expiryDate: f.expiryDate ? new Date(f.expiryDate) : null,
            }))
          })
        }
        await tx.notification.update({
          where: { id: notificationId },
          data: { status: 'ARCHIVED' },
        })
        return event
      })
      console.log(`[API Events] Evento criado e notificação arquivada: ${result.id}`)
      return NextResponse.json(result, { status: 201 })
    } else {
      const event = await prisma.healthEvent.create({
        data: {
          title,
          description,
          observation,
          date: new Date(utcDate),
          startTime: startDateTime,
          endTime: endDateTime,
          type,
          userId,
          professionalId,
        },
      })
      // Criar arquivos se fornecidos
      if (files && Array.isArray(files)) {
        await prisma.files.createMany({
          data: files.map((f: any) => ({
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : require('crypto').randomUUID(),
            eventId: event.id,
            professionalId,
            slot: f.slot,
            name: f.name,
            url: f.url,
            physicalPath: f.physicalPath,
            uploadDate: f.uploadDate ? new Date(f.uploadDate) : null,
            expiryDate: f.expiryDate ? new Date(f.expiryDate) : null,
          }))
        })
      }
      console.log(`[API Events] Evento criado com sucesso: ${event.id}`)
      return createJsonResponse(event, { status: 201 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao criar evento:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestData: body || null,
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao criar evento',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  type DeleteBody = { id: string; deleteFiles?: boolean }
  let body: DeleteBody | undefined = undefined
  try {
    const user = await auth()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const userId = user.id
    body = await req.json()
    const { id, deleteFiles = false } = body as DeleteBody
    console.log(
      `[API Events] Deletando evento: ${id}, deleteFiles: ${deleteFiles}, userId: ${userId}`
    )

    if (!id) {
      console.warn(`[API Events] ID do evento não fornecido`)
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar o evento para obter os arquivos antes de deletar
    const event = await prisma.healthEvent.findUnique({
      where: { id, userId },
      include: { files: true },
    })

    if (!event) {
      console.warn(`[API Events] Evento não encontrado: ${id}`)
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (event.files && event.files.length > 0) {
      if (deleteFiles) {
        // Deletar arquivos completamente
        await prisma.files.deleteMany({ where: { eventId: id } })
        console.log(`[API Events] ${event.files.length} arquivo(s) deletado(s) completamente`)
      } else {
        // Marcar arquivos como órfãos ANTES de deletar evento
        const professional = await prisma.professional.findUnique({ where: { id: event.professionalId || '' }, select: { name: true } })
        const professionalName = professional?.name || 'Profissional não informado'
        const eventTypeLabel = event.type === 'CONSULTA' ? 'Consulta' : 'Exame'
        await prisma.files.updateMany({
          where: { eventId: id },
          data: {
            isOrphaned: true,
            orphanedReason: `${eventTypeLabel} - ${professionalName}: '${event.title}' foi deletado em ${new Date().toLocaleDateString('pt-BR')}`,
          }
        })
        // O eventId será automaticamente SET NULL pelo onDelete: SetNull do banco
        console.log(`[API Events] ${event.files.length} arquivo(s) marcado(s) como órfão(s)`)
      }
    }

    // Deletar o evento
    await prisma.healthEvent.delete({
      where: { id, userId },
    })
    console.log(`[API Events] Evento deletado com sucesso: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[API Events] Erro ao deletar evento:`, {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      requestData: body,
    })
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao deletar evento',
        details: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 }
    )
  }
}
