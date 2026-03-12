import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

import apiClient from '@api/apiClient';
import { ApplicationRound } from '@api/dtos/enums';
import {
  AssignmentConflictError,
  ConflictingApp,
  ExecuteAssignmentRequest,
} from '@api/dtos/assignment.dto';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type ConflictDialogState = {
  open: boolean;
  blockType: 'submitted' | 'in_progress' | null;
  conflictingApps: ConflictingApp[];
  pendingRequest: ExecuteAssignmentRequest | null;
};

const ROUND_LABELS: Record<ApplicationRound, string> = {
  [ApplicationRound.SCREENING]: 'Screening',
  [ApplicationRound.TECHNICAL_INTERVIEW]: 'Technical Interview',
  [ApplicationRound.BEHAVIORAL_INTERVIEW]: 'Behavioral Interview',
};

const BLOCK_TYPE_DESCRIPTIONS: Record<'submitted' | 'in_progress', string> = {
  submitted:
    'One or more applications already have submitted screening reviews. Proceeding will delete those reviews.',
  in_progress:
    'One or more applications have an interview review in progress or already approved. Proceeding will delete those reviews.',
};

const AssignmentPage: React.FC = () => {
  const [round, setRound] = useState<ApplicationRound>(
    ApplicationRound.SCREENING,
  );
  const [selectedApps, setSelectedApps] = useState<Set<number>>(new Set());
  const [selectedRecruiters, setSelectedRecruiters] = useState<Set<number>>(
    new Set(),
  );
  const [recruitersPerApp, setRecruitersPerApp] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState>({
    open: false,
    blockType: null,
    conflictingApps: [],
    pendingRequest: null,
  });

  const {
    data: applications,
    isLoading: appsLoading,
    isError: appsError,
  } = useQuery({
    queryKey: ['assignment-applications', round],
    queryFn: () => apiClient.getAssignmentApplications(round),
  });

  const {
    data: recruiters,
    isLoading: recruitersLoading,
    isError: recruitersError,
  } = useQuery({
    queryKey: ['assignment-recruiters'],
    queryFn: () => apiClient.getActiveRecruiters(),
  });

  const { mutate: executeAssignment, isPending } = useMutation({
    mutationFn: (req: ExecuteAssignmentRequest) =>
      apiClient.executeAssignment(req),
    onSuccess: (data) => {
      setAssignedCount(data.assigned);
      setSnackbar({
        open: true,
        message: `${data.assigned} assignments created`,
        severity: 'success',
      });
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const body = error.response.data as AssignmentConflictError;
        setConflictDialog({
          open: true,
          blockType: body.blockType,
          conflictingApps: body.conflictingApps,
          pendingRequest: {
            applicationIds: Array.from(selectedApps),
            recruiterIds: Array.from(selectedRecruiters),
            recruitersPerApp,
          },
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to execute assignment',
          severity: 'error',
        });
      }
    },
  });

  const handleExecute = () => {
    setValidationError(null);
    setAssignedCount(null);

    if (selectedApps.size === 0) {
      setValidationError('Select at least one application');
      return;
    }
    if (selectedRecruiters.size === 0) {
      setValidationError('Select at least one recruiter');
      return;
    }
    if (recruitersPerApp < 1) {
      setValidationError('Recruiters per app must be at least 1');
      return;
    }
    if (recruitersPerApp > selectedRecruiters.size) {
      setValidationError(
        'Recruiters per app exceeds selected recruiters count',
      );
      return;
    }

    executeAssignment({
      applicationIds: Array.from(selectedApps),
      recruiterIds: Array.from(selectedRecruiters),
      recruitersPerApp,
    });
  };

  const handleForceExecute = () => {
    if (!conflictDialog.pendingRequest) return;
    setConflictDialog((s) => ({ ...s, open: false }));
    executeAssignment({ ...conflictDialog.pendingRequest, force: true });
  };

  const toggleApp = (id: number) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRecruiter = (id: number) => {
    setSelectedRecruiters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allAppsSelected =
    applications != null &&
    applications.length > 0 &&
    selectedApps.size === applications.length;

  const allRecruitersSelected =
    recruiters != null &&
    recruiters.length > 0 &&
    selectedRecruiters.size === recruiters.length;

  const toggleAllApps = () => {
    if (!applications) return;
    if (allAppsSelected) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(applications.map((a) => a.id)));
    }
  };

  const toggleAllRecruiters = () => {
    if (!recruiters) return;
    if (allRecruitersSelected) {
      setSelectedRecruiters(new Set());
    } else {
      setSelectedRecruiters(new Set(recruiters.map((r) => r.id)));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Assign Recruiters
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Executing an assignment <strong>replaces</strong> all existing recruiter
        assignments for the selected applications. Any previously assigned
        recruiters will be removed and replaced with the new round-robin
        distribution.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Left column — Applications */}
        <Box
          sx={{
            flex: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
          }}
        >
          <Typography variant="h6" mb={2}>
            Applications
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Round</InputLabel>
            <Select
              value={round}
              label="Round"
              onChange={(e) => {
                setRound(e.target.value as ApplicationRound);
                setSelectedApps(new Set());
              }}
            >
              {Object.values(ApplicationRound).map((r) => (
                <MenuItem key={r} value={r}>
                  {ROUND_LABELS[r]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {appsLoading && <CircularProgress size={24} />}
          {appsError && (
            <Alert severity="error">Failed to load applications</Alert>
          )}

          {applications && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allAppsSelected}
                    indeterminate={selectedApps.size > 0 && !allAppsSelected}
                    onChange={toggleAllApps}
                  />
                }
                label="Select all"
              />
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {applications.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No applications for this round
                  </Typography>
                ) : (
                  applications.map((app) => (
                    <Box
                      key={app.id}
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <Checkbox
                        checked={selectedApps.has(app.id)}
                        onChange={() => toggleApp(app.id)}
                        size="small"
                      />
                      <Typography variant="body2">
                        {app.applicant.name}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Middle column — Controls */}
        <Box
          sx={{
            width: 220,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="h6">Controls</Typography>

          <TextField
            label="Recruiters per App"
            type="number"
            size="small"
            value={recruitersPerApp}
            onChange={(e) =>
              setRecruitersPerApp(parseInt(e.target.value, 10) || 1)
            }
            slotProps={{ htmlInput: { min: 1 } }}
          />

          {validationError && (
            <Alert severity="warning">{validationError}</Alert>
          )}

          {assignedCount !== null && (
            <Alert severity="success">
              {assignedCount} assignments created
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleExecute}
            disabled={isPending}
          >
            {isPending ? <CircularProgress size={20} /> : 'Execute'}
          </Button>
        </Box>

        {/* Right column — Recruiters */}
        <Box
          sx={{
            flex: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
          }}
        >
          <Typography variant="h6" mb={2}>
            Recruiters
          </Typography>

          {recruitersLoading && <CircularProgress size={24} />}
          {recruitersError && (
            <Alert severity="error">Failed to load recruiters</Alert>
          )}

          {recruiters && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allRecruitersSelected}
                    indeterminate={
                      selectedRecruiters.size > 0 && !allRecruitersSelected
                    }
                    onChange={toggleAllRecruiters}
                  />
                }
                label="Select all"
              />
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {recruiters.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No active recruiters
                  </Typography>
                ) : (
                  recruiters.map((r) => (
                    <Box
                      key={r.id}
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <Checkbox
                        checked={selectedRecruiters.has(r.id)}
                        onChange={() => toggleRecruiter(r.id)}
                        size="small"
                      />
                      <Typography variant="body2">
                        {r.firstName} {r.lastName}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>

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

      <Dialog
        open={conflictDialog.open}
        onClose={() => setConflictDialog((s) => ({ ...s, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Review Data Will Be Lost</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {conflictDialog.blockType &&
              BLOCK_TYPE_DESCRIPTIONS[conflictDialog.blockType]}
          </Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Affected applications:
          </Typography>
          <List dense disablePadding>
            {conflictDialog.conflictingApps.map((app) => (
              <ListItem key={app.id} disableGutters>
                <ListItemText primary={app.applicantName} />
              </ListItem>
            ))}
          </List>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Do you want to proceed and delete the existing review data?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConflictDialog((s) => ({ ...s, open: false }))}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleForceExecute}
          >
            Proceed Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssignmentPage;
