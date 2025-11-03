
import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ResponsiveSidebarLayout from '@/components/ResponsiveSidebarLayout';

export default async function EmissorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await auth();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'EMISSOR') {
    redirect('/login');
  }

  // Renderiza o layout client-side para responsividade
  return (
    <ResponsiveSidebarLayout user={user}>
      {children}
    </ResponsiveSidebarLayout>
  );
}

