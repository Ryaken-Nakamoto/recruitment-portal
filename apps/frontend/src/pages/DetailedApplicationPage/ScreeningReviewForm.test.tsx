import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScreeningReviewForm, validateScores } from './ScreeningReviewForm';
import apiClient from '@api/apiClient';
import type { AssignmentDetailResponse } from '@api/dtos/assignment.dto';

vi.mock('@api/apiClient', () => ({
  default: {
    updateAssignmentNotes: vi.fn().mockResolvedValue({}),
    saveScreeningReview: vi.fn().mockResolvedValue({ id: 42 }),
    submitScreeningReview: vi.fn().mockResolvedValue({ id: 42 }),
  },
}));

const mockSaveScreeningReview = vi.mocked(apiClient.saveScreeningReview);
const mockSubmitScreeningReview = vi.mocked(apiClient.submitScreeningReview);

const baseCriteria = [
  {
    id: 1,
    name: 'Leadership',
    oneDescription: 'Weak',
    twoDescription: 'Moderate',
    threeDescription: 'Strong',
    score: null,
  },
  {
    id: 2,
    name: 'Technical',
    oneDescription: 'Basic',
    twoDescription: 'Intermediate',
    threeDescription: 'Advanced',
    score: null,
  },
];

function makeAssignmentDetail(
  overrides: Partial<AssignmentDetailResponse> = {},
): AssignmentDetailResponse {
  return {
    assignmentId: 10,
    notes: null,
    reviewId: null,
    reviewStatus: 'not_started',
    rubricCriteria: baseCriteria,
    application: {
      id: 5,
      applicantName: 'Alice',
      email: 'alice@example.com',
      major: 'CS',
      academicYear: 'Junior',
      round: 'screening',
      roundStatus: 'in_progress',
      whyC4C: 'I care',
      selfStartedProject: 'Yes',
      communityImpact: 'Yes',
      teamConflict: 'None',
      otherExperiences: 'None',
    },
    ...overrides,
  };
}

describe('ScreeningReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateScores', () => {
    it('returns errors for missing scores', () => {
      const errors = validateScores(baseCriteria, {});
      expect(errors[1]).toBe('Score is required');
      expect(errors[2]).toBe('Score is required');
    });

    it('returns error for non-numeric score', () => {
      const errors = validateScores(baseCriteria, { 1: 'abc', 2: '2' });
      expect(errors[1]).toBe('Must be a number');
      expect(errors[2]).toBeUndefined();
    });

    it('returns error for out-of-range score', () => {
      const errors = validateScores(baseCriteria, { 1: '4', 2: '-1' });
      expect(errors[1]).toBe('Score must be between 0 and 3');
      expect(errors[2]).toBe('Score must be between 0 and 3');
    });

    it('returns no errors for valid scores', () => {
      const errors = validateScores(baseCriteria, { 1: '1', 2: '3' });
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('submitted review (read-only)', () => {
    it('shows "already submitted" message and no form inputs', () => {
      const detail = makeAssignmentDetail({
        reviewStatus: 'submitted',
        rubricCriteria: baseCriteria.map((c, i) => ({ ...c, score: i + 1 })),
      });
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText(/already submitted your review/i)).toBeTruthy();
      expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /save draft/i })).toBeNull();
    });
  });

  describe('draft pre-population', () => {
    it('pre-populates scores from server when reviewStatus is draft', () => {
      const detail = makeAssignmentDetail({
        reviewStatus: 'draft',
        reviewId: 42,
        rubricCriteria: [
          { ...baseCriteria[0], score: 2 },
          { ...baseCriteria[1], score: 3 },
        ],
      });
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      const inputs = screen.getAllByRole('spinbutton');
      const values = inputs.map((i) => (i as HTMLInputElement).value);
      expect(values).toContain('2');
      expect(values).toContain('3');
    });

    it('shows a draft banner when reviewStatus is draft', () => {
      const detail = makeAssignmentDetail({
        reviewStatus: 'draft',
        reviewId: 42,
      });
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      expect(screen.getByText(/saved draft/i)).toBeTruthy();
    });

    it('does not pre-populate scores when reviewStatus is not_started', () => {
      const detail = makeAssignmentDetail({ reviewStatus: 'not_started' });
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      const inputs = screen.getAllByRole('spinbutton');
      for (const input of inputs) {
        expect((input as HTMLInputElement).value).toBe('');
      }
    });
  });

  describe('Save Draft button', () => {
    it('calls saveScreeningReview with only valid partial scores', async () => {
      const detail = makeAssignmentDetail();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '2' } });
      // Leave inputs[1] empty

      fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

      await waitFor(() => {
        expect(mockSaveScreeningReview).toHaveBeenCalledWith({
          assignmentId: 10,
          scores: [{ criteriaId: 1, score: 2 }],
        });
      });
    });

    it('shows success feedback after saving draft', async () => {
      const detail = makeAssignmentDetail();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

      expect(await screen.findByText(/draft saved successfully/i)).toBeTruthy();
    });

    it('shows error feedback when save draft fails', async () => {
      mockSaveScreeningReview.mockRejectedValueOnce(new Error('Network error'));
      const detail = makeAssignmentDetail();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

      expect(await screen.findByText(/failed to save draft/i)).toBeTruthy();
    });

    it('does NOT require all scores for save draft (no validation errors)', async () => {
      const detail = makeAssignmentDetail();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      // No scores entered — clicking Save Draft should still call the API
      fireEvent.click(screen.getByRole('button', { name: /save draft/i }));

      await waitFor(() => {
        expect(mockSaveScreeningReview).toHaveBeenCalled();
      });
      expect(screen.queryByText(/score is required/i)).toBeNull();
    });
  });

  describe('Submit Review button', () => {
    it('validates all scores before submitting', async () => {
      const detail = makeAssignmentDetail();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={vi.fn()}
        />,
      );

      // No scores entered
      fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(
          screen.getAllByText(/score is required/i).length,
        ).toBeGreaterThan(0);
      });
      expect(mockSubmitScreeningReview).not.toHaveBeenCalled();
    });

    it('calls saveScreeningReview then submitScreeningReview on successful submit', async () => {
      const detail = makeAssignmentDetail();
      const onSubmitSuccess = vi.fn();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={onSubmitSuccess}
        />,
      );

      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });

      fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(mockSaveScreeningReview).toHaveBeenCalled();
        expect(mockSubmitScreeningReview).toHaveBeenCalledWith(42);
        expect(onSubmitSuccess).toHaveBeenCalled();
      });
    });

    it('uses existing reviewId from draft when submitting', async () => {
      const detail = makeAssignmentDetail({
        reviewStatus: 'draft',
        reviewId: 99,
        rubricCriteria: baseCriteria.map((c, i) => ({ ...c, score: i + 1 })),
      });
      const onSubmitSuccess = vi.fn();
      render(
        <ScreeningReviewForm
          assignmentDetail={detail}
          onSubmitSuccess={onSubmitSuccess}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(mockSubmitScreeningReview).toHaveBeenCalledWith(99);
      });
    });
  });
});
