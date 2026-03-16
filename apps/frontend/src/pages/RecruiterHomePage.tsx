import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useQuery } from '@tanstack/react-query';
import { signOut } from 'aws-amplify/auth';

import apiClient from '@api/apiClient';
import { ReviewStatus } from '@api/dtos/enums';
import { ApplicationRow } from '../components/ApplicationRow';
import { formatRound } from './ApplicationsPage';

const RecruiterHomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['myAssignments', page],
    queryFn: () => apiClient.getMyAssignments(page, limit),
    enabled: activeTab === 'active',
  });

  const {
    data: completedData,
    isLoading: completedLoading,
    isError: completedError,
  } = useQuery({
    queryKey: ['myCompletedAssignments', page],
    queryFn: () => apiClient.getMyCompletedAssignments(page, limit),
    enabled: activeTab === 'completed',
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Box>
      {/* Banner */}
      <Box
        sx={{
          background:
            'linear-gradient(135deg, rgba(76,99,210,0.88) 0%, rgba(96,90,205,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.18)',
          color: 'white',
          px: 4,
          py: 5.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '28px solid rgba(236, 72, 153, 0.35)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: 150,
            width: 90,
            height: 90,
            borderRadius: '50%',
            border: '14px solid rgba(129, 140, 248, 0.4)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography
            variant="overline"
            sx={{
              opacity: 0.7,
              letterSpacing: 3,
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            Code4Community
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ lineHeight: 1.15, mt: 0.25 }}
          >
            Recruitment Portal
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ opacity: 0.75, mt: 0.5, fontWeight: 500 }}
          >
            Recruiter Dashboard
          </Typography>
        </Box>
        <Button
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          sx={{
            position: 'relative',
            color: 'white',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 2,
            px: 2.5,
            '&:hover': {
              background: 'rgba(255,255,255,0.20)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: 'none',
            },
          }}
        >
          Logout
        </Button>
      </Box>

      <Box sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={2}>
          My Assignments
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_e, val: 'active' | 'completed') => {
            setActiveTab(val);
            setPage(1);
          }}
          sx={{ mb: 3 }}
        >
          <Tab label="In Progress" value="active" />
          <Tab label="Completed" value="completed" />
        </Tabs>

        {activeTab === 'active' && (
          <>
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
                      <TableCell>Reviews</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          No assignments yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.data.map((assignment) => (
                        <ApplicationRow
                          key={assignment.assignmentId}
                          role="recruiter"
                          app={assignment}
                          onClick={() =>
                            navigate(
                              `/recruiter/applications/${assignment.application.id}`,
                            )
                          }
                        />
                      ))
                    )}
                  </TableBody>
                </Table>

                {data.totalPages > 1 && (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}
                  >
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
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {completedError && (
              <Alert severity="error">
                Failed to load completed assignments. Please refresh the page.
              </Alert>
            )}

            {completedData && (
              <>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Applicant</TableCell>
                      <TableCell>Round</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {completedData.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align="center"
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          No completed assignments
                        </TableCell>
                      </TableRow>
                    ) : (
                      completedData.data.map((item) => (
                        <TableRow
                          key={item.assignmentId}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() =>
                            navigate(
                              `/recruiter/completed-assignments/${item.assignmentId}`,
                            )
                          }
                        >
                          <TableCell>
                            {item.application.applicantName}
                          </TableCell>
                          <TableCell>
                            {formatRound(item.application.round as never)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={
                                item.reviewStatus === ReviewStatus.SUBMITTED
                                  ? 'Reviewed'
                                  : 'Not Reviewed'
                              }
                              color={
                                item.reviewStatus === ReviewStatus.SUBMITTED
                                  ? 'success'
                                  : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {completedData.totalPages > 1 && (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}
                  >
                    <Pagination
                      count={completedData.totalPages}
                      page={page}
                      onChange={(_e, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default RecruiterHomePage;
