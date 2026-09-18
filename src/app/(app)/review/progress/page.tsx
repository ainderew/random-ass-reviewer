import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { ProgressView } from './progress-view';
export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  return <ProgressView />;
}
