import { getSession } from '@/lib/auth-utils';
import { redirect } from 'next/navigation';

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role === 'TEACHER') redirect('/dashboard/teacher');
  if (session.role === 'STUDENT') redirect('/dashboard/student');
  redirect('/');
}
