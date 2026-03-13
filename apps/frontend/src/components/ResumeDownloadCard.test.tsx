import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeDownloadCard from './ResumeDownloadCard';
import apiClient from '@api/apiClient';

vi.mock('@api/apiClient', () => ({
  default: {
    downloadResume: vi.fn(),
  },
}));

const mockDownloadResume = vi.mocked(apiClient.downloadResume);

describe('ResumeDownloadCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDownloadResume.mockResolvedValue(undefined);
  });

  it('renders resume label', () => {
    render(<ResumeDownloadCard applicationId={1} />);
    expect(screen.getByText('Resume')).toBeTruthy();
  });

  it('calls downloadResume with applicationId on click', async () => {
    render(<ResumeDownloadCard applicationId={42} />);

    fireEvent.click(screen.getByTestId('resume-download-btn'));

    await waitFor(() => {
      expect(mockDownloadResume).toHaveBeenCalledWith(42);
    });
  });

  it('prevents double-click while loading', async () => {
    let resolveDownload!: () => void;
    mockDownloadResume.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDownload = resolve;
      }),
    );

    render(<ResumeDownloadCard applicationId={1} />);
    const btn = screen.getByTestId('resume-download-btn');

    fireEvent.click(btn);
    fireEvent.click(btn);

    // Resolve the pending download
    resolveDownload();
    await waitFor(() => {
      expect(mockDownloadResume).toHaveBeenCalledTimes(1);
    });
  });
});
