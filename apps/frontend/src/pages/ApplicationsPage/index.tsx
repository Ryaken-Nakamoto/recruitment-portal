import { useState, SyntheticEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  IconButton,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import apiClient from '@api/apiClient';
import { RoundStatus } from '@api/dtos/enums';
import {
  ApplicationListItemDto,
  BulkDecideFailure,
} from '@api/dtos/application.dto';
import { ApplicationRow } from '../../components/ApplicationRow';
import { STATUS_TABS } from './formatters';
import { BulkActionBar } from './BulkActionBar';

export {
  formatRound,
  formatRoundStatus,
  formatFinalDecision,
  formatAcademicYear,
} from './formatters';

const ApplicationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStatus =
    (searchParams.get('roundStatus') as RoundStatus | null) ??
    RoundStatus.PENDING;
  const [page, setPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState<RoundStatus>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [avgScoreSort, setAvgScoreSort] = useState<'asc' | 'desc'>('desc');
  const [decideError, setDecideError] = useState<BulkDecideFailure[] | null>(
    null,
  );
  const [noSelectionError, setNoSelectionError] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [revertingEmails, setRevertingEmails] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const limit = 20;

  const isAwaitingAdmin = activeStatus === RoundStatus.AWAITING_ADMIN;
  const isPendingEmail = activeStatus === RoundStatus.PENDING_EMAIL;

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      'applications',
      page,
      activeStatus,
      isAwaitingAdmin ? avgScoreSort : null,
    ],
    queryFn: () =>
      apiClient.getApplications(
        page,
        limit,
        activeStatus,
        isAwaitingAdmin ? avgScoreSort : undefined,
      ),
  });

  function handleTabChange(_e: SyntheticEvent, value: RoundStatus) {
    setActiveStatus(value);
    setPage(1);
    setSelectedIds(new Set());
    setAvgScoreSort('desc');
  }

  function toggleSort() {
    setAvgScoreSort((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }

  function handleSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (!data) return;
    if (checked) {
      setSelectedIds(new Set(data.data.map((a) => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  async function handleBulkDecide(decision: 'advance' | 'reject') {
    if (selectedIds.size === 0) {
      setNoSelectionError(true);
      return;
    }
    setDeciding(true);
    try {
      const result = await apiClient.bulkDecide({
        applicationIds: Array.from(selectedIds),
        decision,
      });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      if (result.failed.length > 0) {
        setDecideError(result.failed);
      }
    } finally {
      setDeciding(false);
    }
  }

  async function handleBulkSendEmails() {
    if (selectedIds.size === 0) {
      setNoSelectionError(true);
      return;
    }
    setSendingEmails(true);
    try {
      const result = await apiClient.bulkSendEmails({
        applicationIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      if (result.failed.length > 0) {
        setDecideError(result.failed);
      }
    } finally {
      setSendingEmails(false);
    }
  }

  async function handleBulkRevert() {
    if (selectedIds.size === 0) {
      setNoSelectionError(true);
      return;
    }
    setRevertingEmails(true);
    try {
      const result = await apiClient.bulkRevertToPendingAdmin({
        applicationIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
      if (result.failed.length > 0) {
        setDecideError(result.failed);
      }
    } finally {
      setRevertingEmails(false);
    }
  }

  const visibleIds = data?.data.map((a) => a.id) ?? [];
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allSelected;

  const isBatchOperationActive = isAwaitingAdmin || isPendingEmail;
  const colCount = isBatchOperationActive ? 8 : 7;

  return (
    <Box
      sx={{
        p: 4,
        pb: isBatchOperationActive ? 12 : 4,
      }}
    >
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
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        All Applications
      </Typography>

      <Tabs
        value={activeStatus}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {STATUS_TABS.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

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
                <TableCell>{isPendingEmail ? 'Decision' : 'Reviews'}</TableCell>
                {isAwaitingAdmin && (
                  <TableCell>
                    <TableSortLabel
                      active
                      direction={avgScoreSort}
                      onClick={toggleSort}
                    >
                      Avg Score
                    </TableSortLabel>
                  </TableCell>
                )}
                {isBatchOperationActive && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    No applications found
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((app: ApplicationListItemDto) => (
                  <ApplicationRow
                    key={app.id}
                    role="admin"
                    app={app}
                    showAvgScore={isAwaitingAdmin}
                    showFinalDecision={isPendingEmail}
                    onClick={() =>
                      app.roundStatus === RoundStatus.PENDING_EMAIL
                        ? navigate(`/admin/applications/${app.id}/email`)
                        : navigate(`/admin/applications/${app.id}`)
                    }
                    selected={selectedIds.has(app.id)}
                    onSelect={isBatchOperationActive ? handleSelect : undefined}
                  />
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

      {(isAwaitingAdmin || isPendingEmail) && (
        <BulkActionBar
          mode={
            activeStatus as
              | RoundStatus.AWAITING_ADMIN
              | RoundStatus.PENDING_EMAIL
          }
          selectedCount={selectedIds.size}
          deciding={deciding}
          sendingEmails={sendingEmails}
          revertingEmails={revertingEmails}
          onAdvance={() => handleBulkDecide('advance')}
          onReject={() => handleBulkDecide('reject')}
          onSendEmails={handleBulkSendEmails}
          onRevert={handleBulkRevert}
        />
      )}

      <Dialog open={decideError !== null} onClose={() => setDecideError(null)}>
        <DialogTitle>Some decisions could not be applied</DialogTitle>
        <DialogContent>
          <List>
            {decideError?.map((failure) => (
              <ListItem key={failure.id}>
                <ListItemText
                  primary={`${failure.applicantName} — ${failure.reason}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecideError(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={noSelectionError}
        onClose={() => setNoSelectionError(false)}
      >
        <DialogTitle>No applications selected</DialogTitle>
        <DialogContent>
          <Typography>
            Please select at least one application before performing this
            action.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoSelectionError(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicationsPage;
