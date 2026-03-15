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
import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from '@api/dtos/enums';
import {
  ApplicationListItemDto,
  BulkDecideFailure,
} from '@api/dtos/application.dto';
import { ApplicationRow } from '../components/ApplicationRow';

// Format helpers exported for testability and shared use
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

const STATUS_TABS: { label: string; value: RoundStatus }[] = [
  { label: 'Pending', value: RoundStatus.PENDING },
  { label: 'In Progress', value: RoundStatus.IN_PROGRESS },
  { label: 'Awaiting Admin', value: RoundStatus.AWAITING_ADMIN },
  { label: 'Pending Email', value: RoundStatus.PENDING_EMAIL },
  { label: 'Final Decisions', value: RoundStatus.EMAIL_SENT },
];

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
  const [deciding, setDeciding] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const limit = 20;

  const isAwaitingAdmin = activeStatus === RoundStatus.AWAITING_ADMIN;

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

  const visibleIds = data?.data.map((a) => a.id) ?? [];
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allSelected;

  const colCount = isAwaitingAdmin ? 9 : 7;

  return (
    <Box sx={{ p: 4, pb: selectedIds.size > 0 && isAwaitingAdmin ? 12 : 4 }}>
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
                <TableCell>Reviews</TableCell>
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
                {isAwaitingAdmin && (
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
                    onClick={() =>
                      app.roundStatus === RoundStatus.PENDING_EMAIL
                        ? navigate(`/admin/applications/${app.id}/email`)
                        : navigate(`/admin/applications/${app.id}`)
                    }
                    selected={selectedIds.has(app.id)}
                    onSelect={isAwaitingAdmin ? handleSelect : undefined}
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

      {selectedIds.size > 0 && isAwaitingAdmin && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            zIndex: 1200,
          }}
        >
          <Typography>{selectedIds.size} selected</Typography>
          <Button
            variant="contained"
            color="success"
            disabled={deciding}
            onClick={() => handleBulkDecide('advance')}
          >
            Advance
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deciding}
            onClick={() => handleBulkDecide('reject')}
          >
            Reject
          </Button>
        </Box>
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
    </Box>
  );
};

export default ApplicationsPage;
