import { useParams, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, CircularProgress } from '@mui/material';

import apiClient from '@api/apiClient';
import { ApplicationRound } from '@api/dtos/enums';
import { ApplicationContentSections } from '../../components/ApplicationContentSections';
import { AssignmentsSection } from '../../components/AssignmentsSection';
import { InterviewRoundPlaceholder } from '../../components/InterviewRoundPlaceholder';
import { ApplicationHeader } from './ApplicationHeader';
import { ScreeningReviewForm } from './ScreeningReviewForm';
import { AdminReviewsSection } from './AdminReviewsSection';

const DetailedApplicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
      <ApplicationHeader
        applicant={applicant}
        round={data.round}
        roundStatus={data.roundStatus}
        finalDecision={data.finalDecision}
        submittedAt={data.submittedAt}
        backPath={backPath}
        backLabel={backLabel}
      />

      {/* Admin: non-screening round placeholder */}
      {isAdmin && data.round !== ApplicationRound.SCREENING && (
        <InterviewRoundPlaceholder round={data.round} />
      )}

      {/* Admin: Assignments section (screening only) */}
      {isAdmin && data.round === ApplicationRound.SCREENING && (
        <AssignmentsSection
          applicationId={data.id}
          applicationRound={data.round}
          roundStatus={data.roundStatus}
          readonly={false}
        />
      )}

      <ApplicationContentSections
        applicationId={data.id}
        rawGoogleForm={rawGoogleForm}
        showResume={true}
      />

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
        <AdminReviewsSection
          reviews={applicationReviews ?? []}
          isLoading={reviewsLoading}
        />
      )}
    </Box>
  );
};

export default DetailedApplicationPage;
