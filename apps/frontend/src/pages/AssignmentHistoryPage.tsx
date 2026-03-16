import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Pagination,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import { AssignmentHistoryItem } from '@api/dtos/assignment.dto';
import { formatRound } from './ApplicationsPage';

const AssignmentHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assignment-history', page],
    queryFn: () => apiClient.getAssignmentHistory(page, limit),
  });

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

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Assignment History
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Failed to load assignment history. Please refresh the page.
        </Alert>
      )}

      {data && (
        <>
          {data.data.length === 0 ? (
            <Typography color="text.secondary">
              No past assignments found.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.data.map((item: AssignmentHistoryItem) => (
                <Card key={item.id} variant="outlined">
                  <CardActionArea
                    onClick={() =>
                      navigate(`/admin/assignment-history/${item.id}`)
                    }
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Chip
                          label={formatRound(item.round as never)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={
                            item.reviewStatus === 'submitted'
                              ? 'Reviewed'
                              : 'Not Reviewed'
                          }
                          size="small"
                          color={
                            item.reviewStatus === 'submitted'
                              ? 'success'
                              : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        {item.applicantName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Reviewer: {item.recruiterName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Assigned {new Date(item.assignedAt).toLocaleString()}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}

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

export default AssignmentHistoryPage;
