import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/apiClient';

const SentEmailDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const emailId = parseInt(id ?? '0', 10);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sent-email', emailId],
    queryFn: () => apiClient.getSentEmail(emailId),
    enabled: emailId > 0,
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
        <Alert severity="error">Failed to load sent email.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 800 }}>
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={() => navigate('/admin/sent-emails')}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/sent-emails')}
        >
          Back to Sent Emails
        </Typography>
      </Box>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Sent Email
      </Typography>

      <Stack spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            <strong>From:</strong> {data.fromEmail}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>To:</strong> {data.toEmail}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Sent at:</strong> {new Date(data.sentAt).toLocaleString()}
          </Typography>
        </Box>

        <TextField
          label="Subject"
          value={data.subject}
          fullWidth
          InputProps={{ readOnly: true }}
        />

        <TextField
          label="Body"
          value={data.body}
          multiline
          minRows={10}
          fullWidth
          InputProps={{ readOnly: true }}
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
      </Stack>
    </Box>
  );
};

export default SentEmailDetailPage;
