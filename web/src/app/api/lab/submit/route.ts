import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, NotificationType, NotificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Simples rate limit in-memory (MVP, troque por Redis/Edge em produção)
export const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT = 10; // máx. 10 requisições por IP por hora
const PAYLOAD_SIZE_LIMIT = 2 * 1024; // 2KB

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const rate = rateLimitMap.get(ip) || { count: 0, last: now };
  if (now - rate.last > 60 * 60 * 1000) {
    rate.count = 0;
    rate.last = now;
  }
  rate.count++;
  rateLimitMap.set(ip, rate);
  if (rate.count > RATE_LIMIT) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validação básica do payload
  const { patientEmail, doctorName, examDate, report, documento, cpf, cnpj } = body;
  if (!patientEmail || !doctorName || !examDate || !report || !documento) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validação do identificador (CPF para receptor, CNPJ para emissor)
  if (!cpf && !cnpj) {
    return NextResponse.json({ error: 'Either CPF or CNPJ is required' }, { status: 400 });
  }

  // Se CPF fornecido, valida formato (11 dígitos numéricos)
  if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Invalid CPF format' }, { status: 400 });
  }

  // Se CNPJ fornecido, valida formato (14 dígitos numéricos)
  if (cnpj && !/^\d{14}$/.test(cnpj.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Invalid CNPJ format' }, { status: 400 });
  }
  if (typeof report !== 'object' || !report.fileName || !report.fileContent) {
    return NextResponse.json({ error: 'Invalid report format' }, { status: 400 });
  }
  // Limite de tamanho do arquivo
  if (Buffer.byteLength(report.fileContent, 'base64') > PAYLOAD_SIZE_LIMIT) {
    return NextResponse.json({ error: 'Report file too large' }, { status: 413 });
  }

  try {
    // Log detalhado para debug
    console.log('=== DEBUG: Busca de usuário por CPF/CNPJ ===');
    
    let user;
    
    if (cpf) {
      // Busca por CPF (usuário receptor)
      console.log('CPF recebido:', cpf);
      const cpfClean = cpf.replace(/\D/g, '');
      console.log('CPF limpo:', cpfClean);

      // SOLUÇÃO: Buscar por todos os formatos possíveis do CPF
      const cpfFormats = [
        cpf,                    // Como enviado
        cpfClean,              // Apenas números
        cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), // Formato brasileiro
        cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')  // Mesmo formato
      ];

      user = await prisma.user.findFirst({
        where: {
          cpf: {
            in: cpfFormats
          }
        }
      });

      console.log('Formatos de CPF testados:', cpfFormats);
    } else if (cnpj) {
      // Busca por CNPJ (usuário emissor)
      console.log('CNPJ recebido:', cnpj);
      const cnpjClean = cnpj.replace(/\D/g, '');
      console.log('CNPJ limpo:', cnpjClean);

      user = await prisma.user.findFirst({
        where: {
          emissorInfo: {
            cnpj: {
              in: [cnpj, cnpjClean]
            }
          }
        },
        include: {
          emissorInfo: true
        }
      });
    }

    // Log do usuário encontrado
    console.log('Usuário encontrado:', user ? {
      id: user.id,
      cpf: user.cpf,
      email: user.email,
      role: user.role
    } : 'NENHUM');

    if (!user) {
      console.log('=== ERRO: Usuário não encontrado ===');
      return NextResponse.json({
        error: cpf ? 'User not found by CPF' : 'User not found by CNPJ',
        debug: {
          identifier: cpf || cnpj,
          clean: (cpf || cnpj).replace(/\D/g, '')
        }
      }, { status: 404 });
    }

    // Cria o laudo na tabela reports
    // Para envios externos, precisamos de um emissor. Vamos buscar ou criar um usuário emissor genérico
    let senderId = user.id; // Por padrão, o usuário encontrado

    // Se o usuário encontrado é um receptor, precisamos de um emissor
    // Vamos buscar um usuário emissor existente ou criar um genérico
    if (user.role === 'RECEPTOR') {
      const existingEmissor = await prisma.user.findFirst({
        where: { role: 'EMISSOR' }
      });

      if (existingEmissor) {
        senderId = existingEmissor.id;
      } else {
        // Criar um emissor genérico se não existir
        const genericEmissor = await prisma.user.create({
          data: {
            email: 'lab@externo.com',
            password: 'hashed_password', // Em produção, usar hash real
            name: 'Laboratório Externo',
            role: 'EMISSOR'
          }
        });
        senderId = genericEmissor.id;
      }
    }

    const reportRecord = await prisma.report.create({
      data: {
        protocol: documento,
        title: `Laudo - ${doctorName}`,
        fileName: report.fileName,
        fileUrl: `data:application/pdf;base64,${report.fileContent}`,
        senderId,
        receiverId: user.id,
        status: 'SENT'
      }
    });

    // Cria notificação
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.LAB_RESULT,
        payload: { doctorName, examDate, report, reportId: reportRecord.id },
        documento,
        status: NotificationStatus.UNREAD,
      },
    });

    // Atualizar o laudo com o ID da notificação (NÃO definir receivedAt aqui)
    await prisma.report.update({
      where: { id: reportRecord.id },
      data: { notificationId: notification.id }
    });

    return NextResponse.json({
      notificationId: notification.id,
      reportId: reportRecord.id,
      receivedAt: notification.createdAt,
    }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'Internal error' }, { status: 500 });
  }
}
