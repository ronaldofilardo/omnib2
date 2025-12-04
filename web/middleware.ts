import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Bloquear acesso a /share/ para prevenir conflito com arquivos estáticos
  if (pathname.startsWith('/share/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Bypass total para qualquer rota que sirva arquivos ou downloads
  if (
    pathname.startsWith('/api/files/download') ||
    pathname.startsWith('/api/upload') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/api/laudos/upload') ||
    pathname.startsWith('/api/upload-file')
  ) {
    // Deixa passar direto, sem tocar em cookies/sessão/autenticação
    return NextResponse.next()
  }

  // Qualquer outra rota continua com a lógica normal
  return NextResponse.next()
}

export const config = {
  matcher: '/',
}