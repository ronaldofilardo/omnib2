import { NextResponse } from 'next/server';

export async function POST() {
  // Remove o cookie de autenticação
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Set-Cookie': 'token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax',
    },
  });
}
