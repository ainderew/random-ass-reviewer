import type { GenerationStatus } from '@/domain/types';
import { Button } from '@/components/ui/button';

export const GenerationProgress = ({
  status,
  onRetry,
  retrying,
}: {
  status: GenerationStatus;
  onRetry: () => void;
  retrying: boolean;
}) => {
  const pct = status.totalChunks
    ? Math.round((status.processedChunks / status.totalChunks) * 100)
    : 100;
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-2 rounded-lg border border-hairline bg-ground-2 px-4 py-3"
    >
      <p className="text-sm text-ink">
        {status.finished
          ? `${status.cardsCreated} ${status.cardsCreated === 1 ? 'card' : 'cards'} from ${status.processedChunks} ${status.processedChunks === 1 ? 'section' : 'sections'}`
          : `Generating cards… ${status.processedChunks} of ${status.totalChunks} sections`}
      </p>
      {!status.finished ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-ground-3">
          <div
            className="h-full bg-focus transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      {status.failedChunks > 0 ? (
        <p className="text-sm text-ink-2">
          {status.processedChunks - status.failedChunks} of {status.totalChunks}{' '}
          sections processed.
        </p>
      ) : null}
      {status.rejectedCards > 0 ? (
        <p className="text-xs text-muted">
          {status.rejectedCards} card{status.rejectedCards === 1 ? '' : 's'}{' '}
          dropped for not quoting the source.
        </p>
      ) : null}
      {status.message ? (
        <p className="text-sm text-warn">{status.message}</p>
      ) : null}
      {status.finished && status.failedChunks > 0 ? (
        <Button
          variant="ghost"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
        >
          Try the failed sections again
        </Button>
      ) : null}
    </div>
  );
};
