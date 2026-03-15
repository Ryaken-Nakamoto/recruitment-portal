import { useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import apiClient from '@api/apiClient';
import {
  FormYearDisplay,
  CollegeDisplay,
  CodingExperienceDisplay,
  HearAboutC4CDisplay,
} from '@api/dtos/application-detail.dto';
import {
  formatRound,
  formatRoundStatus,
  formatFinalDecision,
} from './ApplicationsPage';
import ResumeDownloadCard from '../components/ResumeDownloadCard';
import { ScreeningCriteriaTable } from '../components/ScreeningCriteriaTable';
import { AssignmentsSection } from '../components/AssignmentsSection';
import { ApplicationRound } from '@api/dtos/enums';
import {
  AdminApplicationReview,
  AssignmentDetailResponse,
} from '@api/dtos/assignment.dto';

const SHORT_ANSWER_QUESTIONS = [
  { key: 'whyC4C', label: 'Why are you interested in C4C?' },
  {
    key: 'selfStartedProject',
    label: 'Reflect on a project you self-started.',
  },
  {
    key: 'communityImpact',
    label: 'Describe a time when you made a positive impact on your community.',
  },
  {
    key: 'teamConflict',
    label:
      'Describe a time when you were working on a team and there was conflict.',
  },
  {
    key: 'otherExperiences',
    label:
      'Highlight or describe any other experiences you think are relevant.',
  },
] as const;

function validateScores(
  rubricCriteria: AssignmentDetailResponse['rubricCriteria'],
  scores: Record<number, string>,
): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const c of rubricCriteria) {
    const val = scores[c.id] ?? '';
    if (val.trim() === '') {
      errors[c.id] = 'Score is required';
    } else if (isNaN(Number(val))) {
      errors[c.id] = 'Must be a number';
    } else {
      const num = Number(val);
      if (num < 0 || num > 3) {
        errors[c.id] = 'Score must be between 0 and 3';
      }
    }
  }
  return errors;
}

// Recruiter screening review form
function ScreeningReviewForm({
  assignmentDetail,
  onSubmitSuccess,
}: {
  assignmentDetail: AssignmentDetailResponse;
  onSubmitSuccess: () => void;
}) {
  const [scores, setScores] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState(assignmentDetail.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScoreChange = (criteriaId: number, value: string) => {
    setScores((prev) => ({ ...prev, [criteriaId]: value }));
    if (errors[criteriaId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[criteriaId];
        return next;
      });
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      apiClient
        .updateAssignmentNotes(assignmentDetail.assignmentId, value || null)
        .catch(() => {});
    }, 800);
  };

  const handleSubmit = async () => {
    const validationErrors = validateScores(
      assignmentDetail.rubricCriteria,
      scores,
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.submitScreeningReview({
        assignmentId: assignmentDetail.assignmentId,
        scores: assignmentDetail.rubricCriteria.map((c) => ({
          criteriaId: c.id,
          score: Number(scores[c.id]),
        })),
      });
      onSubmitSuccess();
    } catch {
      setSubmitError('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (assignmentDetail.reviewStatus === 'submitted') {
    return (
      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Screening Review
        </Typography>
        <Alert severity="success" sx={{ mb: 2 }}>
          You have already submitted your review for this application.
        </Alert>
        <ScreeningCriteriaTable
          criteria={assignmentDetail.rubricCriteria}
          scores={Object.fromEntries(
            assignmentDetail.rubricCriteria
              .filter((c) => c.score !== null)
              .map((c) => [c.id, String(c.score)]),
          )}
        />
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          sx={{ mt: 2, mb: 0.5 }}
        >
          Notes
        </Typography>
        {assignmentDetail.notes ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {assignmentDetail.notes}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No notes submitted.
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Screening Review
      </Typography>
      <ScreeningCriteriaTable
        criteria={assignmentDetail.rubricCriteria}
        scores={scores}
        onScoreChange={handleScoreChange}
        errors={errors}
      />
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
          Notes (optional)
        </Typography>
        <TextField
          multiline
          minRows={3}
          fullWidth
          placeholder="Add any notes..."
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
        />
      </Box>
      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </Box>
    </Paper>
  );
}

const DetailedApplicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isAdmin = !location.pathname.startsWith('/recruiter/');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () =>
      isAdmin
        ? apiClient.getApplicationDetail(Number(id))
        : apiClient.getApplicationDetailRecruiter(Number(id)),
    enabled: !!id,
  });

  const {
    data: assignmentDetail,
    isLoading: assignmentLoading,
    refetch: refetchAssignment,
  } = useQuery({
    queryKey: ['assignment-detail-by-app', id],
    queryFn: () => apiClient.getAssignmentByApplication(Number(id)),
    enabled: !!id && !isAdmin,
    retry: false,
  });

  const { data: applicationReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['application-reviews', id],
    queryFn: () => apiClient.getApplicationReviews(Number(id)),
    enabled: !!id && isAdmin && data?.round === ApplicationRound.SCREENING,
  });

  const stateFrom = location.state as { from?: string; label?: string } | null;
  const backPath =
    stateFrom?.from ??
    (isAdmin ? '/admin/applications' : '/recruiter/applications');
  const backLabel =
    stateFrom?.label ??
    (isAdmin ? 'Back to Applications' : 'Back to Assignments');

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Failed to load application details. Please try again.
        </Alert>
      </Box>
    );
  }

  const { applicant, rawGoogleForm } = data;

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <IconButton
          onClick={() => navigate(backPath)}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(backPath)}
        >
          {backLabel}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {applicant.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {applicant.email}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={formatRound(data.round)} size="small" />
          <Chip label={formatRoundStatus(data.roundStatus)} size="small" />
          {data.finalDecision && (
            <Chip
              label={formatFinalDecision(data.finalDecision)}
              size="small"
              color={data.finalDecision === 'accepted' ? 'success' : 'error'}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Submitted {new Date(data.submittedAt).toLocaleDateString()}
        </Typography>
      </Box>

      {/* Admin: Assignments section */}
      {isAdmin && (
        <AssignmentsSection
          applicationId={data.id}
          applicationRound={data.round}
          roundStatus={data.roundStatus}
          readonly={false}
        />
      )}

      {/* Section 1: Applicant & Basic Info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Applicant Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Full Name
            </Typography>
            <Typography variant="body1">{rawGoogleForm.fullName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{rawGoogleForm.email}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Year
            </Typography>
            <Typography variant="body1">
              {FormYearDisplay[rawGoogleForm.year]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              College
            </Typography>
            <Typography variant="body1">
              {CollegeDisplay[rawGoogleForm.college]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Major
            </Typography>
            <Typography variant="body1">{rawGoogleForm.major}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Applied Before
            </Typography>
            <Typography variant="body1">
              {rawGoogleForm.appliedBefore}
            </Typography>
          </Grid>
          {isAdmin && (
            <Grid size={{ xs: 12 }}>
              <ResumeDownloadCard applicationId={data.id} />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Section 2: Coding Experience */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Coding Experience
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          What experience do you have with coding?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {rawGoogleForm.codingExperience.map((exp) => (
            <Chip
              key={exp}
              label={CodingExperienceDisplay[exp]}
              size="small"
              variant="outlined"
            />
          ))}
          {rawGoogleForm.codingExperienceOther && (
            <Chip
              label={`Other: ${rawGoogleForm.codingExperienceOther}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Section 3: Short Answer Responses */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Short Answer Responses
        </Typography>
        {SHORT_ANSWER_QUESTIONS.map(({ key, label }) => {
          const answer = rawGoogleForm[key];
          if (!answer) return null;
          return (
            <Box key={key} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                sx={{ mb: 0.5 }}
              >
                {label}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {answer}
              </Typography>
            </Box>
          );
        })}
      </Paper>

      {/* Section 4: Additional Info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Additional Information
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            How did you hear about C4C?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {rawGoogleForm.heardAboutC4C.map((source) => (
              <Chip
                key={source}
                label={HearAboutC4CDisplay[source]}
                size="small"
                variant="outlined"
              />
            ))}
            {rawGoogleForm.heardAboutC4COther && (
              <Chip
                label={`Other: ${rawGoogleForm.heardAboutC4COther}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Please list your commitments for this Fall.
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {rawGoogleForm.fallCommitments}
          </Typography>
        </Box>

        {rawGoogleForm.questionsOrConcerns && (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Any questions or concerns?
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {rawGoogleForm.questionsOrConcerns}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Recruiter: co-reviewers */}
      {!isAdmin && (
        <AssignmentsSection applicationId={data.id} readonly={true} />
      )}

      {/* Recruiter: screening review form */}
      {!isAdmin && data.round === ApplicationRound.SCREENING && (
        <>
          {assignmentLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}
          {!assignmentLoading && assignmentDetail && (
            <ScreeningReviewForm
              assignmentDetail={assignmentDetail}
              onSubmitSuccess={() => {
                refetchAssignment();
                queryClient.invalidateQueries({
                  queryKey: ['myAssignments'],
                });
              }}
            />
          )}
        </>
      )}

      {/* Admin: all reviews section (SCREENING round only) */}
      {isAdmin && data.round === ApplicationRound.SCREENING && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            All Reviews
          </Typography>
          {reviewsLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}
          {!reviewsLoading &&
            applicationReviews &&
            applicationReviews.length === 0 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography color="text.secondary">
                  No reviewers have been assigned to this application.
                </Typography>
              </Paper>
            )}
          {!reviewsLoading &&
            applicationReviews &&
            applicationReviews.map((review: AdminApplicationReview) => (
              <Paper
                key={review.assignmentId}
                variant="outlined"
                sx={{ p: 3, mb: 2 }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
                >
                  <Typography variant="h6">{review.recruiterName}</Typography>
                  <Chip
                    label={
                      review.reviewStatus === 'submitted'
                        ? 'Submitted'
                        : 'Not Started'
                    }
                    color={
                      review.reviewStatus === 'submitted'
                        ? 'success'
                        : 'default'
                    }
                    size="small"
                  />
                </Box>
                {review.reviewStatus === 'submitted' ? (
                  <>
                    <ScreeningCriteriaTable
                      criteria={review.rubricCriteria}
                      scores={Object.fromEntries(
                        review.rubricCriteria
                          .filter((c) => c.score !== null)
                          .map((c) => [c.id, String(c.score)]),
                      )}
                    />
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      sx={{ mt: 2, mb: 0.5 }}
                    >
                      Notes
                    </Typography>
                    {review.notes ? (
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: 'pre-wrap' }}
                      >
                        {review.notes}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No notes submitted.
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">
                    No review submitted yet.
                  </Typography>
                )}
              </Paper>
            ))}
          {/* Average score summary — shown only when all reviewers have submitted */}
          {!reviewsLoading &&
            applicationReviews &&
            applicationReviews.length > 0 &&
            applicationReviews.every((r) => r.reviewStatus === 'submitted') &&
            (() => {
              const allScores = applicationReviews.flatMap((r) =>
                r.rubricCriteria
                  .filter((c) => c.score !== null)
                  .map((c) => c.score as number),
              );
              const avg =
                allScores.length > 0
                  ? (
                      allScores.reduce((sum, s) => sum + s, 0) /
                      allScores.length
                    ).toFixed(2)
                  : null;
              return avg !== null ? (
                <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Average Score
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {avg} / 3
                  </Typography>
                </Paper>
              ) : null;
            })()}
        </Box>
      )}
    </Box>
  );
};

export default DetailedApplicationPage;
