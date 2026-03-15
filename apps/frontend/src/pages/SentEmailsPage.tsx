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
import { ApplicationRound, FinalDecision } from '@api/dtos/enums';
import { SentEmailListItemDto } from '@api/dtos/sent-email.dto';
import { formatRound } from './ApplicationsPage';

function formatStageChip(stage: ApplicationRound) {
  return <Chip label={formatRound(stage)} size="small" variant="outlined" />;
}

function formatDecisionChip(decision: FinalDecision | null) {
  if (decision === FinalDecision.ACCEPTED) {
    return <Chip label="Accepted" size="small" color="success" />;
  }
  if (decision === FinalDecision.REJECTED) {
    return <Chip label="Rejected" size="small" color="error" />;
  }
  return <Chip label="Advancing" size="small" color="info" />;
}

const SentEmailsPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sent-emails', page],
    queryFn: () => apiClient.getSentEmails(page, limit),
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
        Sent Emails
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          Failed to load sent emails. Please refresh the page.
        </Alert>
      )}

      {data && (
        <>
          {data.data.length === 0 ? (
            <Typography color="text.secondary">
              No emails have been sent yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.data.map((email: SentEmailListItemDto) => (
                <Card key={email.id} variant="outlined">
                  <CardActionArea
                    onClick={() => navigate(`/admin/sent-emails/${email.id}`)}
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
                        {formatStageChip(
                          email.applicationStage as ApplicationRound,
                        )}
                        {formatDecisionChip(
                          email.finalDecision as FinalDecision | null,
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight="medium">
                        To: {email.toEmail}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {email.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(email.sentAt).toLocaleString()}
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

export default SentEmailsPage;
