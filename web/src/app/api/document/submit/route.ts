import { NextRequest, NextResponse } from 'next/server';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { logDocumentSubmission } from '@/lib/services/auditService';
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer';
import { validateBase64Content } from '@/lib/utils/filePath';
import { prisma } from '@/lib/prisma';

// Rate limiting melhorado com circuit breaker
interface RateLimitEntry {
  count: number;
  last: number;
  blockedUntil?: number;
}

export const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT = 10; // aumentado para 10 requisições por IP por hora
// ATENÇÃO: Limite temporário de 5MB até implementação do BackBlaze
// Após BackBlaze: reduzir para 2KB para compatibilidade com Vercel
const PAYLOAD_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB - TEMPORÁRIO
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos de bloqueio após limite
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === '1';

// Circuit breaker state
let circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
let circuitBreakerFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 5;
let lastCircuitBreakerCheck = Date.now();

function checkCircuitBreaker(): boolean {
  const now = Date.now();

  // Reset circuit breaker se passou tempo suficiente
  if (circuitBreakerState === 'open' && now - lastCircuitBreakerCheck > BLOCK_DURATION) {
    circuitBreakerState = 'half-open';
    circuitBreakerFailures = 0;
  }

  if (circuitBreakerState === 'open') {
    return false; // Bloqueado
  }

  return true; // Permitido
}

function recordCircuitBreakerFailure() {
  circuitBreakerFailures++;
  if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState = 'open';
    lastCircuitBreakerCheck = Date.now();
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  // Verificar circuit breaker
  if (!checkCircuitBreaker()) {
    return NextResponse.json({
      error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
    }, { status: 503 });
  }

  // Rate limiting por IP
  if (!RATE_LIMIT_DISABLED) {
    const now = Date.now();
    const rate = rateLimitMap.get(ip) || { count: 0, last: now };

    // Verificar se IP está bloqueado
    if (rate.blockedUntil && now < rate.blockedUntil) {
      return NextResponse.json({
        error: 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfter: Math.ceil((rate.blockedUntil - now) / 1000)
      }, {
        status: 429,
        headers: { 'Retry-After': Math.ceil((rate.blockedUntil - now) / 1000).toString() }
      });
    }

    // Reset contador se janela expirou
    if (now - rate.last > RATE_LIMIT_WINDOW) {
      rate.count = 0;
      rate.last = now;
      delete rate.blockedUntil;
    }

    rate.count++;

    // Bloquear se excedeu limite
    if (rate.count > RATE_LIMIT) {
      rate.blockedUntil = now + BLOCK_DURATION;
      rateLimitMap.set(ip, rate);
      return NextResponse.json({
        error: 'Limite de requisições excedido. Tente novamente em 15 minutos.',
        retryAfter: BLOCK_DURATION / 1000
      }, {
        status: 429,
        headers: { 'Retry-After': (BLOCK_DURATION / 1000).toString() }
      });
    }

    rateLimitMap.set(ip, rate);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validação básica do payload
  const { patientEmail, doctorName, examDate, report, documento, pacienteId, cpf, documentType } = body;
  if (!patientEmail || !doctorName || !examDate || !report || !documento || !cpf) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  // Validação de CPF (obrigatório para identificar receptor)
  const cleanCpf = cpf.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cleanCpf)) {
    return NextResponse.json({ error: 'Formato de CPF inválido' }, { status: 400 });
  }

  if (typeof report !== 'object' || !report.fileName || !report.fileContent) {
    return NextResponse.json({ error: 'Formato de relatório inválido' }, { status: 400 });
  }

  // Limite de tamanho do arquivo (5MB)
  const fileSize = Buffer.byteLength(report.fileContent, 'base64');
  if (fileSize > PAYLOAD_SIZE_LIMIT) {
    return NextResponse.json({
      error: `Arquivo muito grande. Máximo: ${PAYLOAD_SIZE_LIMIT / (1024 * 1024)}MB, recebido: ${(fileSize / (1024 * 1024)).toFixed(2)}MB`
    }, { status: 413 });
  }

  // Validação de segurança do conteúdo base64
  const validation = validateBase64Content(report.fileContent, 'application/pdf');
  if (!validation.isValid) {
    console.warn('[DOCUMENT SUBMIT] Validação de base64 falhou:', validation.error);
    return NextResponse.json({
      error: `Conteúdo do arquivo inválido: ${validation.error}`
    }, { status: 400 });
  }

  // Timeout para processamento (8s para deixar margem)
  const processingTimeout = 8000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Processamento demorou muito')), processingTimeout)
  );

  try {
    // Processamento principal com timeout
    const processingPromise = async (): Promise<Response> => {
      // Log detalhado para debug
      console.log('=== DEBUG: Busca de usuário por CPF (público) ===');

      let user;

      // Busca por CPF (usuário receptor)
      console.log('CPF recebido:', cpf);
      console.log('CPF limpo:', cleanCpf);

      // Busca direta por CPF normalizado (apenas dígitos)
      user = await prisma.user.findFirst({
        where: { cpf: cleanCpf }
      });

      // Log do usuário encontrado
      console.log('Usuário encontrado:', user ? {
        id: user.id,
        cpf: user.cpf,
        email: user.email,
        role: user.role
      } : 'NENHUM');

      // Calcular hash SHA-256 do arquivo
      const fileHash = calculateFileHashFromBase64(report.fileContent);

      // Registrar no audit log
      await logDocumentSubmission({
        origin: 'PORTAL_PUBLICO',
        emitterCnpj: null,
        receiverCpf: cleanCpf || 'não-informado',
        protocol: body.documento || null,
        fileName: body.report?.fileName || 'arquivo.pdf',
        fileHash: fileHash,
        documentType: documentType || 'result',
        ip: ip.split(',')[0].trim(),
        userAgent: req.headers.get('user-agent') || null,
        status: user ? 'SUCCESS' : 'USER_NOT_FOUND',
        patientId: user?.id || null,
        patientName: user?.name || null,
      });

      if (!user) {
        console.log('=== ERRO: Usuário não encontrado ===');
        return NextResponse.json({
          error: 'Não encontramos nenhum usuário com o CPF informado. Verifique se o CPF está correto ou cadastrado no sistema.'
        }, { status: 404 });
      }

      // Cria o documento na tabela reports
      // Para envios públicos, usamos um sender público genérico
      let senderId = user.id; // Por padrão, o usuário encontrado

      // Para público, sempre criamos um sender público
      const existingPublicSender = await prisma.user.findFirst({
        where: { role: 'EMISSOR', email: 'publico@externo.com' }
      });

      if (existingPublicSender) {
        senderId = existingPublicSender.id;
      } else {
        // Criar um emissor público genérico se não existir
        const publicSender = await prisma.user.create({
          data: {
            email: 'publico@externo.com',
            password: 'hashed_password', // Em produção, usar hash real
            name: 'Envio Público',
            role: 'EMISSOR'
          }
        });
        senderId = publicSender.id;
      }

      const documentTypeLabels = {
        request: 'Solicitação',
        authorization: 'Autorização',
        certificate: 'Atestado',
        result: 'Laudo/Resultado',
        prescription: 'Prescrição',
        invoice: 'Nota Fiscal'
      };

      let reportRecord;
      try {
        reportRecord = await prisma.report.create({
          data: {
            protocol: documento,
            title: `${documentTypeLabels[documentType as keyof typeof documentTypeLabels] || 'Documento'} - ${doctorName}`,
            fileName: report.fileName,
            fileUrl: `data:application/pdf;base64,${report.fileContent}`,
            senderId,
            receiverId: user.id,
            paciente_id: pacienteId,
            status: 'SENT'
          }
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && err?.meta?.target?.includes('protocol')) {
          return NextResponse.json({
            error: 'Já existe um documento cadastrado com este número de exame. Por favor, utilize outro número.'
          }, { status: 409 });
        }
        throw err;
      }

      // Cria notificação
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.LAB_RESULT, // Mantém para compatibilidade
          payload: { doctorName, examDate, report, reportId: reportRecord.id, documentType },
          documento,
          status: NotificationStatus.UNREAD,
        },
      });

      // Atualizar o documento com o ID da notificação
      await prisma.report.update({
        where: { id: reportRecord.id },
        data: { notificationId: notification.id }
      });

      return NextResponse.json({
        notificationId: notification.id,
        reportId: reportRecord.id,
        receivedAt: notification.createdAt,
      }, { status: 202 });
    };

    // Executar com timeout
    const result: Response = await Promise.race([processingPromise(), timeoutPromise]);
    return result;

  } catch (err) {
    // Registrar falha no circuit breaker
    recordCircuitBreakerFailure();

    const error = err as Error;
    if (error.message === 'Processamento demorou muito') {
      return NextResponse.json({
        error: 'Processamento demorou muito. Tente novamente.'
      }, { status: 408 });
    }

    return NextResponse.json({
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}
