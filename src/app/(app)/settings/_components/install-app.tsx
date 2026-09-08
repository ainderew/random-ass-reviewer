'use client';

import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/lib/use-install-prompt';

export const InstallApp = () => {
  const state = useInstallPrompt();
  return (
    <section
      aria-label="Install"
      className="space-y-2 border-t border-hairline pt-6"
    >
      <h2 className="font-serif text-2xl text-ink">On your home screen</h2>
      {state.kind === 'installed' ? (
        <p className="text-sm text-ink-2">
          Aloft is installed. Open it from your home screen.
        </p>
      ) : null}
      {state.kind === 'prompt' ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-ink-2">
            Runs full screen, with its own icon.
          </p>
          <Button onClick={() => void state.install()}>Install Aloft</Button>
        </div>
      ) : null}
      {state.kind === 'ios' ? (
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          In Safari, tap Share, then “Add to Home Screen”. Aloft then opens full
          screen like an app.
        </p>
      ) : null}
      {state.kind === 'unavailable' ? (
        <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">
          Open this page in Chrome, Edge, or Safari on your phone to install
          Aloft as an app.
        </p>
      ) : null}
    </section>
  );
};
