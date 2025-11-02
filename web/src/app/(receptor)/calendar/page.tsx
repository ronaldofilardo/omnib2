import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CalendarClient from './CalendarClient';

export default async function CalendarPage() {
  const user = await auth();
  if (!user || user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/login');
  return <CalendarClient userId={user.id} />;
}