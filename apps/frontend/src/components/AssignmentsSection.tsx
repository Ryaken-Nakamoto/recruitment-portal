import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';

import apiClient from '@api/apiClient';
import { ApplicationRound, RoundStatus } from '@api/dtos/enums';
import {
  AssignmentReviewerInfo,
  RecruiterSummaryDto,
} from '@api/dtos/assignment.dto';

interface Props {
  applicationId: number;
  applicationRound?: ApplicationRound;
  roundStatus?: RoundStatus;
  readonly: boolean;
}

export function AssignmentsSection({
  applicationId,
  applicationRound: _applicationRound,
  roundStatus,
  readonly,
}: Props) {
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<{
    assignmentId: number;
    recruiterName: string;
    hasReview: boolean;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<number | ''>(
    '',
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: readonly
      ? ['co-reviewers', applicationId]
      : ['application-assignments', applicationId],
    queryFn: () =>
      readonly
        ? apiClient.getCoReviewers(applicationId)
        : apiClient.getApplicationAssignments(applicationId),
  });

  const { data: recruiters } = useQuery({
    queryKey: ['active-recruiters'],
    queryFn: () => apiClient.getActiveRecruiters(),
    enabled: !readonly,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['application-assignments', applicationId],
    });
    queryClient.invalidateQueries({
      queryKey: ['application-detail', String(applicationId)],
    });
  }, [queryClient, applicationId]);

  const handleRemoveClick = (a: AssignmentReviewerInfo) => {
    setRemoveTarget({
      assignmentId: a.assignmentId,
      recruiterName: a.recruiterName,
      hasReview: a.reviewStatus !== 'not_started',
    });
  };

  const handleRemoveConfirm = async (force: boolean) => {
    if (!removeTarget) return;
    setActionError(null);
    try {
      await apiClient.removeReviewer(removeTarget.assignmentId, force);
      setRemoveTarget(null);
      refetch();
    } catch {
      setActionError('Failed to remove reviewer. Please try again.');
    }
  };

  const handleAddReviewer = async () => {
    if (!selectedRecruiterId) return;
    setActionError(null);
    try {
      await apiClient.addReviewer({
        applicationId,
        recruiterId: selectedRecruiterId,
      });
      setSelectedRecruiterId('');
      setAdding(false);
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setActionError(e?.response?.data?.message ?? 'Failed to add reviewer.');
    }
  };

  const assignedIds = new Set(assignments?.map((a) => a.recruiterId) ?? []);
  const availableRecruiters = (recruiters ?? []).filter(
    (r: RecruiterSummaryDto) => !assignedIds.has(r.id),
  );

  if (assignmentsLoading) return <CircularProgress size={20} />;

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {readonly ? 'Co-Reviewers' : 'Assignments'}
      </Typography>

      {!readonly && actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {assignments && assignments.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No reviewers assigned.
        </Typography>
      )}

      {assignments &&
        assignments.map((a) => (
          <Box
            key={a.assignmentId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{a.recruiterName}</Typography>
              <Chip
                label={
                  a.reviewStatus === 'submitted'
                    ? 'Submitted'
                    : a.reviewStatus === 'draft'
                    ? 'Draft'
                    : 'Not Started'
                }
                size="small"
                color={
                  a.reviewStatus === 'submitted'
                    ? 'success'
                    : a.reviewStatus === 'draft'
                    ? 'warning'
                    : 'default'
                }
              />
            </Box>
            {!readonly && (
              <Button
                size="small"
                color="error"
                onClick={() => handleRemoveClick(a)}
                disabled={
                  roundStatus === RoundStatus.PENDING_EMAIL ||
                  roundStatus === RoundStatus.EMAIL_SENT
                }
                title={
                  roundStatus === RoundStatus.PENDING_EMAIL ||
                  roundStatus === RoundStatus.EMAIL_SENT
                    ? 'Cannot remove reviewers once an email has been sent.'
                    : undefined
                }
              >
                Remove
              </Button>
            )}
          </Box>
        ))}

      {!readonly && (
        <>
          <Divider sx={{ my: 2 }} />

          {roundStatus === RoundStatus.PENDING_EMAIL ||
          roundStatus === RoundStatus.EMAIL_SENT ? (
            <>
              <Button variant="outlined" size="small" disabled>
                Add Reviewer
              </Button>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                Adding reviewers is unavailable once an email has been sent.
              </Typography>
            </>
          ) : adding ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedRecruiterId}
                  onChange={(e) =>
                    setSelectedRecruiterId(e.target.value as number)
                  }
                  displayEmpty
                >
                  <MenuItem value="">Select a recruiter</MenuItem>
                  {availableRecruiters.map((r: RecruiterSummaryDto) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.firstName} {r.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="small"
                onClick={
                  roundStatus === RoundStatus.AWAITING_ADMIN
                    ? () => setConfirmAddOpen(true)
                    : handleAddReviewer
                }
                disabled={!selectedRecruiterId}
              >
                Add
              </Button>
              <Button size="small" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setAdding(true)}
            >
              Add Reviewer
            </Button>
          )}

          <Dialog
            open={confirmAddOpen}
            onClose={() => setConfirmAddOpen(false)}
          >
            <DialogTitle>Confirm Add Reviewer</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Adding this reviewer will change the application status back to
                In Progress. No existing reviews will be lost.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmAddOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={async () => {
                  await handleAddReviewer();
                  setConfirmAddOpen(false);
                }}
              >
                Confirm Add
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!removeTarget} onClose={() => setRemoveTarget(null)}>
            <DialogTitle>Remove Reviewer</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {removeTarget?.hasReview
                  ? `Removing ${removeTarget.recruiterName} will delete their review. Proceed?`
                  : `Remove ${removeTarget?.recruiterName} from this application?`}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button
                color="error"
                onClick={() => handleRemoveConfirm(!!removeTarget?.hasReview)}
              >
                Remove
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Paper>
  );
}
