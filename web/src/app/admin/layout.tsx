import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await auth();

  if (!user) {
    redirect('/login');
  }

  // Se não for usuário admin, redireciona para login
  if (user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {children}
    </main>
  );
}