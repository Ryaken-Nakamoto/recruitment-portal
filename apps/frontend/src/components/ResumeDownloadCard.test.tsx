import { render, screen, fireEvent } from '@testing-library/react';
import ResumeDownloadCard from './ResumeDownloadCard';

describe('ResumeDownloadCard', () => {
  const mockUrl = 'https://s3.example.com/resume.pdf';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders resume label', () => {
    render(<ResumeDownloadCard resumeUrl={mockUrl} />);
    expect(screen.getByText('Resume')).toBeTruthy();
  });

  it('opens resume URL in new tab on click', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ResumeDownloadCard resumeUrl={mockUrl} />);

    fireEvent.click(screen.getByTestId('resume-download-btn'));

    expect(openSpy).toHaveBeenCalledWith(mockUrl, '_blank');
  });
});
