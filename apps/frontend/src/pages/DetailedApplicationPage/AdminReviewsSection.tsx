import { Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import { AdminApplicationReview } from '@api/dtos/assignment.dto';
import { ReviewStatus } from '@api/dtos/enums';
import { ScreeningCriteriaTable } from '../../components/ScreeningCriteriaTable';

interface AdminReviewsSectionProps {
  reviews: AdminApplicationReview[];
  isLoading: boolean;
}

export function AdminReviewsSection({
  reviews,
  isLoading,
}: AdminReviewsSectionProps) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        All Reviews
      </Typography>
      {isLoading && <CircularProgress size={24} sx={{ mt: 2 }} />}
      {!isLoading && reviews.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography color="text.secondary">
            No reviewers have been assigned to this application.
          </Typography>
        </Paper>
      )}
      {!isLoading &&
        reviews.map((review: AdminApplicationReview) => (
          <Paper
            key={review.assignmentId}
            variant="outlined"
            sx={{ p: 3, mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h6">{review.recruiterName}</Typography>
              <Chip
                label={
                  review.reviewStatus === ReviewStatus.SUBMITTED
                    ? 'Submitted'
                    : 'Not Started'
                }
                color={
                  review.reviewStatus === ReviewStatus.SUBMITTED
                    ? 'success'
                    : 'default'
                }
                size="small"
              />
            </Box>
            {review.reviewStatus === ReviewStatus.SUBMITTED ? (
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
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
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
      {!isLoading &&
        reviews.length > 0 &&
        reviews.every((r) => r.reviewStatus === ReviewStatus.SUBMITTED) &&
        (() => {
          const numCriteria = reviews[0]?.rubricCriteria.length || 0;
          const maxScore = 3 * numCriteria;
          const allScores = reviews.flatMap((r) =>
            r.rubricCriteria
              .filter((c) => c.score !== null)
              .map((c) => c.score as number),
          );
          const totalScore =
            allScores.length > 0 ? allScores.reduce((sum, s) => sum + s, 0) : 0;
          const numReviewers = reviews.length;
          const avgPerReviewer =
            numReviewers > 0 ? (totalScore / numReviewers).toFixed(2) : null;
          return avgPerReviewer !== null ? (
            <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Average Score
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {avgPerReviewer} / {maxScore}
              </Typography>
            </Paper>
          ) : null;
        })()}
    </Box>
  );
}
