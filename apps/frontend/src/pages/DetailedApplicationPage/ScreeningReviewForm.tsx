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
  // Pre-populate scores from server when DRAFT
  const initialScores =
    assignmentDetail.reviewStatus === ReviewStatus.DRAFT
      ? Object.fromEntries(
          assignmentDetail.rubricCriteria
            .filter((c) => c.score !== null)
            .map((c) => [c.id, String(c.score)]),
        )
      : {};

  const [scores, setScores] = useState<Record<number, string>>(initialScores);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState(assignmentDetail.notes ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveDraftSuccess, setSaveDraftSuccess] = useState(false);
  const [saveDraftError, setSaveDraftError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(
    assignmentDetail.reviewId ?? null,
  );
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

  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveDraftError(null);
    setSaveDraftSuccess(false);
    try {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);

      // Only send scores that have a valid value
      const partialScores = Object.entries(scores)
        .filter(([, v]) => v.trim() !== '' && !isNaN(Number(v)))
        .map(([id, v]) => ({ criteriaId: Number(id), score: Number(v) }));

      // Fire notes save and draft save in parallel
      const [, result] = await Promise.all([
        apiClient.updateAssignmentNotes(
          assignmentDetail.assignmentId,
          notes || null,
        ),
        apiClient.saveScreeningReview({
          assignmentId: assignmentDetail.assignmentId,
          scores: partialScores,
        }),
      ]);
      setReviewId(result.id);
      setSaveDraftSuccess(true);
    } catch {
      setSaveDraftError('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
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

      // Save notes and scores in parallel
      const [, savedResult] = await Promise.all([
        apiClient.updateAssignmentNotes(
          assignmentDetail.assignmentId,
          notes || null,
        ),
        apiClient.saveScreeningReview({
          assignmentId: assignmentDetail.assignmentId,
          scores: assignmentDetail.rubricCriteria.map((c) => ({
            criteriaId: c.id,
            score: Number(scores[c.id]),
          })),
        }),
      ]);
      const currentReviewId = reviewId ?? savedResult.id;

      // Then finalize the draft as submitted
      await apiClient.submitScreeningReview(currentReviewId);
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
      {assignmentDetail.reviewStatus === ReviewStatus.DRAFT && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have a saved draft. Your scores have been pre-populated.
        </Alert>
      )}
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
      {saveDraftSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Draft saved successfully.
        </Alert>
      )}
      {saveDraftError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {saveDraftError}
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleSaveDraft}
          disabled={saving || submitting}
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || saving}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </Box>
    </Paper>
  );
}
