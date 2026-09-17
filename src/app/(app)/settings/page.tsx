import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { ApiKeyForm } from './_components/api-key-form';
import { InstallApp } from './_components/install-app';
import { PreferencesForm } from './_components/preferences-form';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div className="page-heading">
        <h1 className="font-serif text-ink">Make yourself at home.</h1>
        <p>Your study plan and preferences, all in one place.</p>
      </div>
      <div className="paper-panel p-5 sm:p-8">
        <PreferencesForm />
      </div>
      <div className="paper-panel p-5 sm:p-8">
        <InstallApp />
      </div>
      <div className="paper-panel p-5 sm:p-8">
        <ApiKeyForm />
      </div>
    </section>
  );
}
