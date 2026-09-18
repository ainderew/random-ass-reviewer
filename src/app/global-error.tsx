'use client';

// Last resort: the root layout itself failed, so this owns html and body.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: '#fcf2ec',
          color: '#153b43',
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          padding: '3rem 1.5rem',
        }}
      >
        <main style={{ maxWidth: '28rem', margin: '0 auto' }}>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.75rem',
              margin: '0 0 0.75rem',
            }}
          >
            Aloft hit a snag
          </h1>
          <p
            style={{ lineHeight: 1.6, color: '#47636d', margin: '0 0 1.25rem' }}
          >
            Your progress is safe on the server. Reload to keep going.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#296b5c',
              color: '#fcf2ec',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.75rem 1.25rem',
              fontSize: '1rem',
              fontWeight: 500,
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: '1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: '#526e77',
              }}
            >
              Reference {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
