import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MAX_FILE_BYTES, UploadDropzone } from './upload-dropzone';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('UploadDropzone', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('states the limits before anything is uploaded', () => {
    render(<UploadDropzone />, { wrapper });
    expect(screen.getByText(/PDF up to 20 pages/)).toBeInTheDocument();
  });

  it('refuses an oversized file with the limit, without calling the server', async () => {
    render(<UploadDropzone />, { wrapper });
    const big = new File([new Uint8Array(8)], 'huge.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(big, 'size', { value: MAX_FILE_BYTES + 1 });

    await userEvent.upload(screen.getByLabelText('Upload notes'), big);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Files must be under 10MB',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('asks for text before making cards from an empty paste', async () => {
    render(<UploadDropzone />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'Make cards' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Paste some notes first.',
    );
  });
});
