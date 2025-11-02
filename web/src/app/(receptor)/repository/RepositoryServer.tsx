import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RepositoryClient from './RepositoryClient';

export default async function RepositoryServer() {
  const user = await auth();
  if (!user) redirect('/login');
  if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/laudos');
  return <RepositoryClient userId={user.id} />;
}
