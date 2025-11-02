import { auth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { redirect } from 'next/navigation';

export default async function EmissorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await auth();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'EMISSOR') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar userRole="EMISSOR" user={user} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}