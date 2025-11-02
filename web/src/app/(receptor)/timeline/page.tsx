import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TimelineClient from './TimelineClient';

export default async function TimelinePage() {
  const user = await auth();
  if (!user) redirect('/login');
  if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/laudos');
  return <TimelineClient userId={user.id} />;
}