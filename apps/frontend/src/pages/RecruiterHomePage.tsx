import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';

import apiClient from '@api/apiClient';
import { ApplicationRound } from '@api/dtos/enums';
import { RecruiterAssignmentDto } from '@api/dtos/assignment.dto';

const ROUND_LABELS: Record<ApplicationRound, string> = {
  [ApplicationRound.SCREENING]: 'Screening',
  [ApplicationRound.TECHNICAL_INTERVIEW]: 'Technical Interview',
  [ApplicationRound.BEHAVIORAL_INTERVIEW]: 'Behavioral Interview',
};

const REVIEW_STATUS_LABELS: Record<
  RecruiterAssignmentDto['reviewStatus'],
  string
> = {
  not_started: 'Not Started',
  submitted: 'Submitted',
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
};

const REVIEW_STATUS_COLORS: Record<
  RecruiterAssignmentDto['reviewStatus'],
  'default' | 'warning' | 'success' | 'info' | 'primary'
> = {
  not_started: 'default',
  draft: 'warning',
  submitted: 'info',
  pending_approval: 'warning',
  approved: 'success',
};

function ReviewStatusBadge({
  status,
}: {
  status: RecruiterAssignmentDto['reviewStatus'];
}) {
  return (
    <Chip
      label={REVIEW_STATUS_LABELS[status]}
      color={REVIEW_STATUS_COLORS[status]}
      size="small"
    />
  );
}

const RecruiterHomePage: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['myAssignments', page],
    queryFn: () => apiClient.getMyAssignments(page, limit),
  });

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        My Assignments
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Failed to load assignments. Please refresh the page.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Applicant</TableCell>
                <TableCell>Round</TableCell>
                <TableCell>Graduation Year</TableCell>
                <TableCell>Review Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    No assignments yet
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((assignment) => (
                  <TableRow
                    key={assignment.assignmentId}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      {assignment.application.applicantName}
                    </TableCell>
                    <TableCell>
                      {ROUND_LABELS[assignment.application.round]}
                    </TableCell>
                    <TableCell>
                      {assignment.application.graduationYear}
                    </TableCell>
                    <TableCell>
                      <ReviewStatusBadge status={assignment.reviewStatus} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default RecruiterHomePage;
