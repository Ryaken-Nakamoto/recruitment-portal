import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DetailedApplicationPage from './DetailedApplicationPage';
import apiClient from '@api/apiClient';
import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from '@api/dtos/enums';
import {
  FormYear,
  College,
  CodingExperience,
  HearAboutC4C,
} from '@api/dtos/application-detail.dto';
import type { ApplicationDetailResponse } from '@api/dtos/application-detail.dto';

vi.mock('@api/apiClient', () => ({
  default: {
    getApplicationDetail: vi.fn(),
  },
}));

const mockGetDetail = vi.mocked(apiClient.getApplicationDetail);

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/admin/applications/1']}>
        <Routes>
          <Route
            path="/admin/applications/:id"
            element={<DetailedApplicationPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const fullMockData: ApplicationDetailResponse = {
  id: 1,
  round: ApplicationRound.SCREENING,
  roundStatus: RoundStatus.PENDING,
  finalDecision: null,
  submittedAt: '2026-03-01T10:00:00Z',
  applicant: {
    id: 1,
    name: 'Alice Smith',
    email: 'alice@example.com',
    academicYear: AcademicYear.FIRST,
    major: 'CS',
  },
  rawGoogleForm: {
    id: 1,
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    year: FormYear.FIRST,
    college: College.KHOURY,
    major: 'CS',
    codingExperience: [CodingExperience.FUNDIES_1, CodingExperience.OOD],
    codingExperienceOther: null,
    resumeUrl: 'https://s3.example.com/resume.pdf',
    whyC4C: 'I want to make a difference',
    selfStartedProject: 'Built a todo app',
    communityImpact: 'Volunteered at food bank',
    teamConflict: null,
    otherExperiences: null,
    heardAboutC4C: [HearAboutC4C.INSTAGRAM, HearAboutC4C.WORD_OF_MOUTH],
    heardAboutC4COther: null,
    appliedBefore: 'no',
    fallCommitments: 'Full time student',
    questionsOrConcerns: null,
    submittedAt: '2026-03-01T10:00:00Z',
  },
};

describe('DetailedApplicationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner', () => {
    mockGetDetail.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows error alert on fetch failure', async () => {
    mockGetDetail.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(
      await screen.findByText(/Failed to load application details/),
    ).toBeTruthy();
  });

  it('renders all sections with correct question labels', async () => {
    mockGetDetail.mockResolvedValue(fullMockData);
    renderPage();

    // Header — name appears in header + form section
    expect((await screen.findAllByText('Alice Smith')).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0);

    // Applicant info
    expect(screen.getByText('Applicant Information')).toBeTruthy();
    expect(screen.getByText('First Year')).toBeTruthy();
    expect(
      screen.getByText('Khoury College of Computer Sciences'),
    ).toBeTruthy();

    // Coding experience
    expect(screen.getByText('Coding Experience')).toBeTruthy();
    expect(screen.getByText('Fundies 1/Intro (CS2500/CS2000)')).toBeTruthy();
    expect(screen.getByText('OOD/Intro 2 (CS3500/CS3100)')).toBeTruthy();

    // Short answers
    expect(screen.getByText('Why are you interested in C4C?')).toBeTruthy();
    expect(screen.getByText('I want to make a difference')).toBeTruthy();
    expect(
      screen.getByText('Reflect on a project you self-started.'),
    ).toBeTruthy();
    expect(screen.getByText('Built a todo app')).toBeTruthy();

    // Additional info
    expect(screen.getByText('Additional Information')).toBeTruthy();
    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('Word of Mouth')).toBeTruthy();
    expect(screen.getByText('Full time student')).toBeTruthy();

    // Resume
    expect(screen.getByText('Resume')).toBeTruthy();
  });

  it('hides null optional fields', async () => {
    mockGetDetail.mockResolvedValue(fullMockData);
    renderPage();

    await screen.findAllByText('Alice Smith');

    // teamConflict and otherExperiences are null — their labels should not show
    expect(
      screen.queryByText(
        'Describe a time when you were working on a team and there was conflict.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Highlight or describe any other experiences you think are relevant.',
      ),
    ).toBeNull();

    // questionsOrConcerns is null — should not show
    expect(screen.queryByText('Any questions or concerns?')).toBeNull();
  });

  it('renders resume download card with correct URL', async () => {
    mockGetDetail.mockResolvedValue(fullMockData);
    renderPage();

    // Wait for content to load
    await screen.findAllByText('Alice Smith');
    expect(screen.getByText('Resume')).toBeTruthy();
    expect(screen.getByTestId('resume-download-btn')).toBeTruthy();
  });
});
