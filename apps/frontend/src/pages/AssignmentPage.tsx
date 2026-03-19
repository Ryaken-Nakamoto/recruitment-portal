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
  InputAdornment,
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
import ClearIcon from '@mui/icons-material/Clear';
import { useMutation, useQuery } from '@tanstack/react-query';

import apiClient from '@api/apiClient';
import { ApplicationRound } from '@api/dtos/enums';
import {
  ExecuteAssignmentRequest,
  RecruiterSummaryDto,
} from '@api/dtos/assignment.dto';
import { ApplicationSummaryDto } from '@api/dtos/application.dto';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

type PreviewRow = {
  appId: number;
  appName: string;
  recruiterSlots: number[];
};

/** Compute C(n, r) — number of combinations */
export function comb(n: number, r: number): number {
  if (r > n || r < 0) return 0;
  if (r === 0 || r === n) return 1;
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/** Generate all r-combinations of an array */
export function* combinations<T>(arr: T[], r: number): Generator<T[]> {
  const n = arr.length;
  if (r > n || r < 0) {
    return;
  }
  if (r === 0) {
    yield [];
    return;
  }
  if (r === 1) {
    for (const x of arr) yield [x];
    return;
  }
  const [first, ...rest] = arr;
  // Yield combinations that include first
  for (const combo of combinations(rest, r - 1)) {
    yield [first, ...combo];
  }
  // Yield combinations that don't include first
  yield* combinations(rest, r);
}

export function computePreview(
  selectedAppsList: ApplicationSummaryDto[],
  selectedRecruitersList: RecruiterSummaryDto[],
  perApp: number,
): PreviewRow[] {
  const K = selectedRecruitersList.length;
  const recruiterIds = selectedRecruitersList.map((r) => r.id);

  // If perApp === 1, use simple round-robin (no pairing to optimize)
  if (perApp === 1) {
    return selectedAppsList.map((app, i) => ({
      appId: app.id,
      appName: app.applicant.name,
      recruiterSlots: [recruiterIds[i % K]],
    }));
  }

  // Check if exhaustive search is feasible
  const totalCombos = comb(K, perApp);
  if (totalCombos > 10000) {
    // Fall back to round-robin
    return selectedAppsList.map((app, i) => ({
      appId: app.id,
      appName: app.applicant.name,
      recruiterSlots: Array.from({ length: perApp }, (_, j) => {
        return recruiterIds[(i * perApp + j) % K];
      }),
    }));
  }

  // Exhaustive optimization: for each app, pick the subset with fewest repeated pairs
  const pairCount = new Map<string, number>();
  const result: PreviewRow[] = [];

  for (const app of selectedAppsList) {
    let bestSubset: number[] | null = null;
    let bestScore = Infinity;

    for (const subset of combinations(recruiterIds, perApp)) {
      // Score this subset by counting existing pairs
      let score = 0;
      for (let i = 0; i < subset.length; i++) {
        for (let j = i + 1; j < subset.length; j++) {
          const pairKey = [subset[i], subset[j]].sort().join(':');
          score += pairCount.get(pairKey) ?? 0;
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestSubset = subset;
      }
    }

    // Record the chosen subset
    if (bestSubset) {
      for (let i = 0; i < bestSubset.length; i++) {
        for (let j = i + 1; j < bestSubset.length; j++) {
          const pairKey = [bestSubset[i], bestSubset[j]].sort().join(':');
          pairCount.set(pairKey, (pairCount.get(pairKey) ?? 0) + 1);
        }
      }
      result.push({
        appId: app.id,
        appName: app.applicant.name,
        recruiterSlots: bestSubset,
      });
    }
  }

  return result;
}

export function detectRepeatedPairings(
  rows: PreviewRow[],
  recruiterMap: Map<number, string>,
): string[] {
  const pairCounts = new Map<string, number>();

  for (const row of rows) {
    const recruiterSlots = row.recruiterSlots;
    for (let i = 0; i < recruiterSlots.length; i++) {
      for (let j = i + 1; j < recruiterSlots.length; j++) {
        const pairKey = [recruiterSlots[i], recruiterSlots[j]].sort().join(':');
        pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
      }
    }
  }

  const repeatedPairs: string[] = [];
  for (const [pairKey, count] of pairCounts.entries()) {
    if (count > 1) {
      const [id1, id2] = pairKey.split(':').map(Number);
      const name1 = recruiterMap.get(id1) ?? `#${id1}`;
      const name2 = recruiterMap.get(id2) ?? `#${id2}`;
      repeatedPairs.push(`${name1} & ${name2}`);
    }
  }

  return repeatedPairs;
}

type SkippedAppInfo = {
  id: number;
  name: string;
  existingRecruiters: string[];
};

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
  const [appSearch, setAppSearch] = useState('');
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [skippedApps, setSkippedApps] = useState<SkippedAppInfo[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [recruiterNameMap, setRecruiterNameMap] = useState<Map<number, string>>(
    new Map(),
  );

  const fuzzyMatch = (query: string, target: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = target.toLowerCase();
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  };

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
      const skipped = data.skippedApps.map(({ appId, existingRecruiters }) => ({
        id: appId,
        name: appMap.get(appId) ?? `App #${appId}`,
        existingRecruiters,
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

  const filteredApps = (applications ?? []).filter((a) =>
    fuzzyMatch(appSearch, a.applicant.name),
  );

  const filteredRecruiters = (recruiters ?? []).filter((r) =>
    fuzzyMatch(recruiterSearch, `${r.firstName} ${r.lastName}`),
  );

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

    const appsList = Array.from(selectedApps).map(
      (id) => applications!.find((a) => a.id === id)!,
    );
    const recruitersList = Array.from(selectedRecruiters).map(
      (id) => recruiters!.find((r) => r.id === id)!,
    );

    // Build recruiter name map for later use
    const nameMap = new Map(
      recruitersList.map((r) => [r.id, `${r.firstName} ${r.lastName}`]),
    );
    setRecruiterNameMap(nameMap);

    setPreviewRows(computePreview(appsList, recruitersList, recruitersPerApp));
  };

  const handleSlotChange = (
    rowIndex: number,
    slotIndex: number,
    recruiterId: number,
  ) => {
    setPreviewRows((prev) =>
      prev!.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              recruiterSlots: row.recruiterSlots.map((id, j) =>
                j === slotIndex ? recruiterId : id,
              ),
            }
          : row,
      ),
    );
  };

  const handleConfirmPreview = () => {
    if (!previewRows) return;

    setPreviewRows(null);
    executeAssignment({
      pairs: previewRows.map((row) => ({
        appId: row.appId,
        recruiterIds: row.recruiterSlots,
      })),
    });
  };

  const repeatedPairings =
    previewRows && recruiters
      ? detectRepeatedPairings(previewRows, recruiterNameMap)
      : [];

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
    filteredApps.length > 0 &&
    filteredApps.every((a) => selectedApps.has(a.id));

  const allRecruitersSelected =
    filteredRecruiters.length > 0 &&
    filteredRecruiters.every((r) => selectedRecruiters.has(r.id));

  const toggleAllApps = () => {
    if (allAppsSelected) {
      setSelectedApps(
        (prev) =>
          new Set(
            Array.from(prev).filter(
              (id) => !filteredApps.map((a) => a.id).includes(id),
            ),
          ),
      );
    } else {
      setSelectedApps(
        (prev) => new Set([...prev, ...filteredApps.map((a) => a.id)]),
      );
    }
  };

  const toggleAllRecruiters = () => {
    if (allRecruitersSelected) {
      setSelectedRecruiters(
        (prev) =>
          new Set(
            Array.from(prev).filter(
              (id) => !filteredRecruiters.map((r) => r.id).includes(id),
            ),
          ),
      );
    } else {
      setSelectedRecruiters(
        (prev) => new Set([...prev, ...filteredRecruiters.map((r) => r.id)]),
      );
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
        Only <strong>unassigned (Pending)</strong> applications are shown. To
        add reviewers to an application already in progress, use its detail
        page. Assignments are <strong>additive</strong> — selecting an
        application and clicking Execute will not remove existing reviewers.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Left column — Applications */}
        <Box
          sx={{
            flex: 0.45,
            height: 550,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" mb={2}>
            Applications
          </Typography>

          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            slotProps={{
              input: {
                endAdornment: appSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setAppSearch('')}
                      edge="end"
                      aria-label="clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{ mb: 2 }}
          />

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
                {filteredApps.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {appSearch
                      ? 'No matching applications'
                      : 'No applications for this round'}
                  </Typography>
                ) : (
                  filteredApps.map((app) => (
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
            flex: 1,
            height: 550,
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
                  <li key={a.id}>
                    <strong>{a.name}</strong>
                    {a.existingRecruiters.length > 0 && (
                      <>
                        {' '}
                        — already assigned: {a.existingRecruiters.join(', ')}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="contained"
              onClick={handleExecute}
              disabled={isPending}
              sx={{ px: 6, py: 3, fontSize: '1.5rem' }}
            >
              {isPending ? <CircularProgress size={20} /> : 'Execute'}
            </Button>
          </Box>
        </Box>

        {/* Right column — Recruiters */}
        <Box
          sx={{
            flex: 0.45,
            height: 550,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" mb={2}>
            Recruiters
          </Typography>

          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={recruiterSearch}
            onChange={(e) => setRecruiterSearch(e.target.value)}
            slotProps={{
              input: {
                endAdornment: recruiterSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setRecruiterSearch('')}
                      edge="end"
                      aria-label="clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{ mb: 2 }}
          />

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
                {filteredRecruiters.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {recruiterSearch
                      ? 'No matching recruiters'
                      : 'No active recruiters'}
                  </Typography>
                ) : (
                  filteredRecruiters.map((r) => (
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

      <Dialog
        open={previewRows !== null}
        onClose={() => setPreviewRows(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview Assignments</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {previewRows?.length ?? 0} application
            {previewRows?.length !== 1 ? 's' : ''} will each receive{' '}
            {recruitersPerApp} recruiter
            {recruitersPerApp !== 1 ? 's' : ''} (
            {(previewRows?.length ?? 0) * recruitersPerApp} total assignments).
            Edit assignments below and confirm to execute.
          </DialogContentText>

          {repeatedPairings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {repeatedPairings.length} recruiter pair
              {repeatedPairings.length !== 1 ? 's' : ''} will be assigned
              together more than once: {repeatedPairings.join(', ')}. You can
              edit the assignments below.
            </Alert>
          )}

          <List dense disablePadding>
            {(previewRows ?? []).map((row, i) => (
              <ListItem
                key={i}
                disableGutters
                sx={{ gap: 1, flexWrap: 'wrap', mb: 1 }}
              >
                <ListItemText
                  primary={row.appName}
                  sx={{ minWidth: 150, flex: '0 0 auto' }}
                />
                {row.recruiterSlots.map((recruiterId, slot) => (
                  <Select
                    key={slot}
                    size="small"
                    value={recruiterId}
                    onChange={(e) =>
                      handleSlotChange(i, slot, Number(e.target.value))
                    }
                    sx={{ minWidth: 140 }}
                  >
                    {(recruiters ?? [])
                      .filter((r) => selectedRecruiters.has(r.id))
                      .map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {r.firstName} {r.lastName}
                        </MenuItem>
                      ))}
                  </Select>
                ))}
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewRows(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmPreview}>
            Confirm & Execute
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
