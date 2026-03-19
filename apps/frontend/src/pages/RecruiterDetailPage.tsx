import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import apiClient from '@api/apiClient';
import { AccountStatus } from '@api/dtos/enums';

function AccountStatusChip({ status }: { status: string }) {
  if (status === AccountStatus.ACTIVATED) {
    return <Chip label="Active" color="success" size="small" />;
  }
  if (status === AccountStatus.INVITE_SENT) {
    return <Chip label="Invite Sent" color="warning" size="small" />;
  }
  return <Chip label="Deactivated" size="small" />;
}

function ReviewStatusChip({ status }: { status: string }) {
  if (status === 'submitted' || status === 'approved') {
    return (
      <Chip
        label={status === 'submitted' ? 'Submitted' : 'Approved'}
        color="success"
        size="small"
      />
    );
  }
  if (status === 'pending_approval') {
    return <Chip label="Pending Approval" color="warning" size="small" />;
  }
  if (status === 'draft') {
    return <Chip label="Draft" size="small" />;
  }
  return <Chip label="Not Started" size="small" />;
}

function formatRound(round: string): string {
  if (round === 'screening') return 'Screening';
  if (round === 'technical_interview') return 'Technical Interview';
  if (round === 'behavioral_interview') return 'Behavioral Interview';
  return round;
}

const RecruiterDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter-detail', id],
    queryFn: () => apiClient.getRecruiterDetail(Number(id)),
    enabled: !!id,
  });

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
          Failed to load recruiter details. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <IconButton
          onClick={() => navigate('/admin/recruiters')}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/recruiters')}
        >
          Back to Recruiters
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {data.firstName && data.lastName
            ? `${data.firstName} ${data.lastName}`
            : 'Pending Setup'}
        </Typography>
        <AccountStatusChip status={data.accountStatus} />
      </Box>

      {/* Info card */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recruiter Information
        </Typography>
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{data.email}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Account Status
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <AccountStatusChip status={data.accountStatus} />
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Date Joined
            </Typography>
            <Typography variant="body1">
              {new Date(data.createdDate).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Stats row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Assigned', value: data.stats.total },
          { label: 'Submitted', value: data.stats.submitted },
          { label: 'Not Started', value: data.stats.notStarted },
          { label: 'In Progress', value: data.stats.inProgress },
        ].map(({ label, value }) => (
          <Paper
            key={label}
            variant="outlined"
            sx={{ p: 3, flex: '1 1 140px', textAlign: 'center' }}
          >
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Assignments table */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Assignments
        </Typography>

        {data.assignments.length === 0 ? (
          <Typography color="text.secondary">No assignments yet.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Applicant</TableCell>
                <TableCell>Round</TableCell>
                <TableCell>Review Status</TableCell>
                <TableCell>Assigned Date</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.assignments.map((a) => (
                <TableRow key={a.assignmentId}>
                  <TableCell>{a.applicantName}</TableCell>
                  <TableCell>{formatRound(a.round)}</TableCell>
                  <TableCell>
                    <ReviewStatusChip status={a.reviewStatus} />
                  </TableCell>
                  <TableCell>
                    {new Date(a.assignedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="primary"
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                      onClick={() =>
                        navigate(`/admin/applications/${a.applicationId}`, {
                          state: {
                            from: `/admin/recruiters/${id}`,
                            label: 'Back to Recruiter',
                          },
                        })
                      }
                    >
                      View
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default RecruiterDetailPage;
