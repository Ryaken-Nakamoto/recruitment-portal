import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import apiClient from '@api/apiClient';
import { AssignmentDetailResponse } from '@api/dtos/assignment.dto';
import { ReviewStatus } from '@api/dtos/enums';
import { ScreeningCriteriaTable } from '../../components/ScreeningCriteriaTable';

export function validateScores(
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

export function ScreeningReviewForm({
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
      // Flush pending debounced notes save before submitting review
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      await apiClient.updateAssignmentNotes(
        assignmentDetail.assignmentId,
        notes || null,
      );

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

  if (assignmentDetail.reviewStatus === ReviewStatus.SUBMITTED) {
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
