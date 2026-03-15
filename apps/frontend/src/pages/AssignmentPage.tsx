import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMutation, useQuery } from '@tanstack/react-query';

import apiClient from '@api/apiClient';
import { ApplicationRound, RoundStatus } from '@api/dtos/enums';
import { ExecuteAssignmentRequest } from '@api/dtos/assignment.dto';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type AppSummary = { id: number; name: string };

const ROUND_LABELS: Record<ApplicationRound, string> = {
  [ApplicationRound.SCREENING]: 'Screening',
  [ApplicationRound.TECHNICAL_INTERVIEW]: 'Technical Interview',
  [ApplicationRound.BEHAVIORAL_INTERVIEW]: 'Behavioral Interview',
};

const AssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [round, setRound] = useState<ApplicationRound>(
    ApplicationRound.SCREENING,
  );
  const [selectedApps, setSelectedApps] = useState<Set<number>>(new Set());
  const [selectedRecruiters, setSelectedRecruiters] = useState<Set<number>>(
    new Set(),
  );
  const [recruitersPerApp, setRecruitersPerApp] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Dialog state
  const [blockedApps, setBlockedApps] = useState<AppSummary[]>([]);
  const [awaitingApps, setAwaitingApps] = useState<AppSummary[]>([]);
  const [pendingRequest, setPendingRequest] =
    useState<ExecuteAssignmentRequest | null>(null);
  const [skippedApps, setSkippedApps] = useState<AppSummary[]>([]);

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
      const appMap = new Map(
        (applications ?? []).map((a) => [a.id, a.applicant.name]),
      );
      const skipped = data.skippedAppIds.map((id) => ({
        id,
        name: appMap.get(id) ?? `App #${id}`,
      }));
      setSkippedApps(skipped);
      setSnackbar({
        open: true,
        message: `${data.assigned} new assignment${
          data.assigned !== 1 ? 's' : ''
        } created`,
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to execute assignment',
        severity: 'error',
      });
    },
  });

  const buildRequest = (): ExecuteAssignmentRequest => ({
    applicationIds: Array.from(selectedApps),
    recruiterIds: Array.from(selectedRecruiters),
    recruitersPerApp,
  });

  const handleExecute = () => {
    setValidationError(null);
    setSkippedApps([]);

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

    const selectedAppObjects = (applications ?? []).filter((a) =>
      selectedApps.has(a.id),
    );

    // Hard deny: PENDING_EMAIL or EMAIL_SENT
    const blocked = selectedAppObjects
      .filter(
        (a) =>
          a.roundStatus === RoundStatus.PENDING_EMAIL ||
          a.roundStatus === RoundStatus.EMAIL_SENT,
      )
      .map((a) => ({ id: a.id, name: a.applicant.name }));
    if (blocked.length > 0) {
      setBlockedApps(blocked);
      return;
    }

    // Confirmation required: AWAITING_ADMIN
    const awaiting = selectedAppObjects
      .filter((a) => a.roundStatus === RoundStatus.AWAITING_ADMIN)
      .map((a) => ({ id: a.id, name: a.applicant.name }));
    if (awaiting.length > 0) {
      setAwaitingApps(awaiting);
      setPendingRequest(buildRequest());
      return;
    }

    executeAssignment(buildRequest());
  };

  const handleConfirmAwaiting = () => {
    if (pendingRequest) executeAssignment(pendingRequest);
    setAwaitingApps([]);
    setPendingRequest(null);
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
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={() => navigate('/admin/home')}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/home')}
        >
          Back to Home
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight="bold" mb={1}>
        Assign Recruiters
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Assignments are <strong>additive</strong> — existing assignments are
        kept. Recruiters already assigned to an application are skipped; only
        new pairs are created.
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

          {skippedApps.length > 0 && (
            <Alert severity="info" onClose={() => setSkippedApps([])}>
              <strong>
                {skippedApps.length} application
                {skippedApps.length !== 1 ? 's' : ''} had duplicates skipped:
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {skippedApps.map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
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

      {/* Hard deny: PENDING_EMAIL / EMAIL_SENT */}
      <Dialog open={blockedApps.length > 0} onClose={() => setBlockedApps([])}>
        <DialogTitle>Cannot Assign Reviewers</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The following applications have already had emails sent and their
            recruitment window is closed. Remove them from your selection before
            proceeding.
          </DialogContentText>
          <List dense disablePadding sx={{ mt: 1 }}>
            {blockedApps.map((a) => (
              <ListItem key={a.id} disableGutters>
                <ListItemText primary={a.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setBlockedApps([])}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation: AWAITING_ADMIN */}
      <Dialog
        open={awaitingApps.length > 0}
        onClose={() => {
          setAwaitingApps([]);
          setPendingRequest(null);
        }}
      >
        <DialogTitle>Status Will Reset</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The following applications are currently awaiting an admin decision.
            Adding a reviewer will reset their status back to{' '}
            <strong>In Progress</strong>. No existing reviews will be deleted.
          </DialogContentText>
          <List dense disablePadding sx={{ mt: 1 }}>
            {awaitingApps.map((a) => (
              <ListItem key={a.id} disableGutters>
                <ListItemText primary={a.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAwaitingApps([]);
              setPendingRequest(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmAwaiting}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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

export default AssignmentPage;
