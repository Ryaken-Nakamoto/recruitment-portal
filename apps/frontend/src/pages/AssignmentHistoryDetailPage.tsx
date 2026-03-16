import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import { ReviewStatus } from '@api/dtos/enums';
import { formatRound } from './ApplicationsPage';
import { ApplicationContentSections } from '../components/ApplicationContentSections';
import { ScreeningCriteriaTable } from '../components/ScreeningCriteriaTable';

const AssignmentHistoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const assignmentId = parseInt(id ?? '0', 10);
  const navigate = useNavigate();
  const location = useLocation();
  const isRecruiter = location.pathname.startsWith('/recruiter/');

  const {
    data: assignment,
    isLoading: assignmentLoading,
    isError: assignmentError,
  } = useQuery({
    queryKey: isRecruiter
      ? ['recruiter-completed-assignment-detail', assignmentId]
      : ['assignment-history-detail', assignmentId],
    queryFn: () =>
      isRecruiter
        ? apiClient.getRecruiterCompletedAssignmentDetail(assignmentId)
        : apiClient.getAssignmentHistoryDetail(assignmentId),
    enabled: assignmentId > 0,
  });

  const { data: appDetail, isLoading: appLoading } = useQuery({
    queryKey: isRecruiter
      ? ['recruiter-application-detail', assignment?.application.id]
      : ['application-detail', assignment?.application.id],
    queryFn: () =>
      isRecruiter
        ? apiClient.getApplicationDetailRecruiter(assignment!.application.id)
        : apiClient.getApplicationDetail(assignment!.application.id),
    enabled: !!assignment?.application.id,
  });

  const backPath = isRecruiter
    ? '/recruiter/home'
    : '/admin/assignment-history';
  const backLabel = isRecruiter ? 'Back to Home' : 'Back to Assignment History';

  if (assignmentLoading || appLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (assignmentError || !assignment || !appDetail) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load assignment detail.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Back navigation */}
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

      {/* Assignment metadata banner */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'action.hover' }}>
        <Typography variant="overline" color="text.secondary">
          Past Assignment
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          <Chip
            label={formatRound(assignment.round as never)}
            size="small"
            variant="outlined"
          />
          <Chip
            label={
              assignment.reviewStatus === ReviewStatus.SUBMITTED
                ? 'Reviewed'
                : 'Not Reviewed'
            }
            size="small"
            color={
              assignment.reviewStatus === ReviewStatus.SUBMITTED
                ? 'success'
                : 'default'
            }
          />
        </Box>
        <Typography variant="body1" sx={{ mt: 1 }}>
          <strong>Reviewer:</strong> {assignment.recruiterName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Assigned {new Date(assignment.assignedAt).toLocaleString()}
        </Typography>
      </Paper>

      {/* Applicant header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {appDetail.applicant.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {appDetail.applicant.email}
        </Typography>
      </Box>

      {/* Shared application content sections */}
      <ApplicationContentSections
        applicationId={appDetail.id}
        rawGoogleForm={appDetail.rawGoogleForm}
        showResume={true}
      />

      {/* Review section */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Screening Review
        </Typography>
        {assignment.reviewStatus === ReviewStatus.SUBMITTED ? (
          <>
            <ScreeningCriteriaTable
              criteria={assignment.rubricCriteria}
              scores={Object.fromEntries(
                assignment.rubricCriteria
                  .filter((c) => c.score !== null)
                  .map((c) => [c.id, String(c.score)]),
              )}
            />
            {assignment.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  sx={{ mb: 0.5 }}
                >
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {assignment.notes}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Typography color="text.secondary">
            No review was submitted for this assignment.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default AssignmentHistoryDetailPage;
