import { auth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function ReceptorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await auth();

  if (!user) {
    redirect('/login');
  }

  // Se for usuário emissor, redireciona para login
  if (user.role === 'EMISSOR') {
    redirect('/login');
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {children}
    </main>
  );
}