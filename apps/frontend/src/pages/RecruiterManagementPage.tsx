import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '@api/apiClient';
import { AccountStatus } from '@api/dtos/enums';
import { User } from '@api/dtos/user.dto';
import InviteRecruiterModal from '@components/InviteRecruiterModal';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === AccountStatus.ACTIVATED) {
    return <Chip label="Active" color="success" size="small" />;
  }
  if (status === AccountStatus.INVITE_SENT) {
    return <Chip label="Invite Sent" color="warning" size="small" />;
  }
  return <Chip label="Deactivated" size="small" />;
}

function ActionButton({
  recruiter,
  onDeactivate,
  onReactivate,
}: {
  recruiter: User;
  onDeactivate: (id: number) => void;
  onReactivate: (id: number) => void;
}) {
  if (recruiter.accountStatus === AccountStatus.ACTIVATED) {
    return (
      <Button
        size="small"
        color="error"
        variant="outlined"
        onClick={() => onDeactivate(recruiter.id)}
      >
        Deactivate
      </Button>
    );
  }
  if (recruiter.accountStatus === AccountStatus.DEACTIVATED) {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={() => onReactivate(recruiter.id)}
      >
        Reactivate
      </Button>
    );
  }
  return null;
}

const RecruiterManagementPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const queryClient = useQueryClient();
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiters', page],
    queryFn: () => apiClient.getRecruiters(page, limit),
  });

  const { mutate: deactivate } = useMutation({
    mutationFn: (id: number) => apiClient.deactivateRecruiter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiters'] });
      showSnackbar('Recruiter deactivated', 'success');
    },
    onError: () => showSnackbar('Failed to deactivate recruiter', 'error'),
  });

  const { mutate: reactivate } = useMutation({
    mutationFn: (id: number) => apiClient.reactivateRecruiter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiters'] });
      showSnackbar('Recruiter reactivated', 'success');
    },
    onError: () => showSnackbar('Failed to reactivate recruiter', 'error'),
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleInviteSuccess = (email: string) => {
    queryClient.invalidateQueries({ queryKey: ['recruiters'] });
    showSnackbar(`Invite sent to ${email}`, 'success');
  };

  const handleInviteError = () => {
    showSnackbar('Failed to send invite. Please try again.', 'error');
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Recruiter Management
        </Typography>
        <Button variant="contained" onClick={() => setModalOpen(true)}>
          Invite Recruiter
        </Button>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Failed to load recruiters. Please refresh the page.
        </Alert>
      )}

      {data && (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date Invited</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    No recruiters found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((recruiter) => (
                  <TableRow key={recruiter.id}>
                    <TableCell>
                      {recruiter.firstName} {recruiter.lastName}
                    </TableCell>
                    <TableCell>{recruiter.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={recruiter.accountStatus} />
                    </TableCell>
                    <TableCell>
                      {new Date(recruiter.createdDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <ActionButton
                        recruiter={recruiter}
                        onDeactivate={(id) => deactivate(id)}
                        onReactivate={(id) => reactivate(id)}
                      />
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

      <InviteRecruiterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleInviteSuccess}
        onError={handleInviteError}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RecruiterManagementPage;
