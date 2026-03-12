import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from '@api/dtos/enums';
import { ApplicationListItemDto } from '@api/dtos/application.dto';

// Format helpers exported for testability
export function formatRound(round: ApplicationRound): string {
  const roundMap: Record<ApplicationRound, string> = {
    [ApplicationRound.SCREENING]: 'Screening',
    [ApplicationRound.TECHNICAL_INTERVIEW]: 'Technical Interview',
    [ApplicationRound.BEHAVIORAL_INTERVIEW]: 'Behavioral Interview',
  };
  return roundMap[round];
}

export function formatRoundStatus(status: RoundStatus): string {
  const statusMap: Record<RoundStatus, string> = {
    [RoundStatus.PENDING]: 'Pending',
    [RoundStatus.IN_PROGRESS]: 'In Progress',
    [RoundStatus.AWAITING_ADMIN]: 'Awaiting Admin',
    [RoundStatus.PENDING_EMAIL]: 'Pending Email',
    [RoundStatus.EMAIL_SENT]: 'Email Sent',
  };
  return statusMap[status];
}

export function formatFinalDecision(decision: FinalDecision | null): string {
  if (!decision) return '—';
  const decisionMap: Record<FinalDecision, string> = {
    [FinalDecision.ACCEPTED]: 'Accepted',
    [FinalDecision.REJECTED]: 'Rejected',
  };
  return decisionMap[decision];
}

export function formatAcademicYear(year: AcademicYear): string {
  const yearMap: Record<AcademicYear, string> = {
    [AcademicYear.FIRST]: 'First',
    [AcademicYear.SECOND]: 'Second',
    [AcademicYear.THIRD]: 'Third',
    [AcademicYear.FOURTH]: 'Fourth',
    [AcademicYear.FIFTH]: 'Fifth',
  };
  return yearMap[year];
}

function RoundStatusBadge({ status }: { status: RoundStatus }) {
  if (
    status === RoundStatus.IN_PROGRESS ||
    status === RoundStatus.AWAITING_ADMIN
  ) {
    return (
      <Chip label={formatRoundStatus(status)} color="warning" size="small" />
    );
  }
  if (status === RoundStatus.EMAIL_SENT) {
    return (
      <Chip label={formatRoundStatus(status)} color="success" size="small" />
    );
  }
  return <Chip label={formatRoundStatus(status)} size="small" />;
}

function FinalDecisionBadge({ decision }: { decision: FinalDecision | null }) {
  if (!decision) {
    return <Typography variant="body2">—</Typography>;
  }
  if (decision === FinalDecision.ACCEPTED) {
    return <Chip label="Accepted" color="success" size="small" />;
  }
  if (decision === FinalDecision.REJECTED) {
    return <Chip label="Rejected" color="error" size="small" />;
  }
  return <Typography variant="body2">—</Typography>;
}

const ApplicationsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', page],
    queryFn: () => apiClient.getApplications(page, limit),
  });

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        All Applications
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Failed to load applications. Please refresh the page.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Major</TableCell>
                <TableCell>Academic Year</TableCell>
                <TableCell>Round</TableCell>
                <TableCell>Round Status</TableCell>
                <TableCell>Final Decision</TableCell>
                <TableCell>Submitted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((app: ApplicationListItemDto) => (
                  <TableRow
                    key={app.id}
                    onClick={() => navigate(`/admin/applications/${app.id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell>{app.applicant.name}</TableCell>
                    <TableCell>{app.applicant.email}</TableCell>
                    <TableCell>{app.applicant.major}</TableCell>
                    <TableCell>
                      {formatAcademicYear(app.applicant.academicYear)}
                    </TableCell>
                    <TableCell>{formatRound(app.round)}</TableCell>
                    <TableCell>
                      <RoundStatusBadge status={app.roundStatus} />
                    </TableCell>
                    <TableCell>
                      <FinalDecisionBadge decision={app.finalDecision} />
                    </TableCell>
                    <TableCell>
                      {new Date(app.submittedAt).toLocaleDateString()}
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

export default ApplicationsPage;
