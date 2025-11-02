import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';

export default async function NotificationsPage() {
  const user = await auth();
  if (!user) redirect('/login');
  if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/laudos');
  return <NotificationCenter userId={user.id} />;
}