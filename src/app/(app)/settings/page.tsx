import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { ApiKeyForm } from './_components/api-key-form';
import { InstallApp } from './_components/install-app';
import { PreferencesForm } from './_components/preferences-form';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');
  return (
    <section className="mx-auto max-w-2xl space-y-10">
      <h1 className="font-serif text-4xl text-ink">Settings</h1>
      <PreferencesForm />
      <InstallApp />
      <div className="border-t border-hairline pt-6">
        <ApiKeyForm />
      </div>
    </section>
  );
}
