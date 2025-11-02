import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfessionalsTab } from '@/components/ProfessionalsTab';

function resolveBaseUrl() {
  // Prefer env específica se existir
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Em ambientes Vercel
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Fallback local
  return 'http://localhost:3000';
}

async function getProfessionals(userId: string) {
  const base = resolveBaseUrl();
  const res = await fetch(`${base}/api/professionals?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  return res.ok ? res.json() : [];
}

export default async function ProfessionalsPage() {
  const user = await auth();
  if (!user) redirect('/login');
  if (user.email === 'labor@omni.com' || user.role === 'EMISSOR') redirect('/laudos');
  const professionals = await getProfessionals(user.id);
  // setProfessionals será criado no componente, pois é um useState
  return <ProfessionalsTab professionals={professionals} setProfessionals={() => {}} userId={user.id} />;
}