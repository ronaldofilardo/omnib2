import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PersonalDataTab from '@/components/PersonalDataTab';

export default async function DadosPessoaisPage() {
  const user = await auth();
  if (!user) redirect('/login');
  if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/laudos');
  return <PersonalDataTab userId={user.id} />;
}