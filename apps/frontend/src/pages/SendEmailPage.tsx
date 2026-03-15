import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import { RoundStatus } from '@api/dtos/enums';

const SendEmailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const applicationId = parseInt(id ?? '0', 10);
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['email-preview', applicationId],
    queryFn: () => apiClient.getEmailPreview(applicationId),
    enabled: applicationId > 0,
  });

  // Initialize editable fields once preview loads
  if (preview && !initialized) {
    setSubject(preview.subject);
    setBody(preview.body);
    setInitialized(true);
  }

  const insertVariable = (variable: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const token = `{{${variable}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + token + body.slice(end);
    setBody(newBody);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const handleSaveTemplate = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await apiClient.updateEmail(preview.templateId, { subject, body });
      setSnackbarMsg('Template saved successfully.');
    } catch {
      setSendError('Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSendError(null);
    try {
      await apiClient.sendApplicationEmail(applicationId, { subject, body });
      navigate(`/admin/applications?roundStatus=${RoundStatus.PENDING_EMAIL}`);
    } catch {
      setSendError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !preview) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Failed to load email preview. This application may not be in Pending
          Email state.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 800 }}>
      <Box sx={{ mb: 2 }}>
        <IconButton
          onClick={() =>
            navigate(
              `/admin/applications?roundStatus=${RoundStatus.PENDING_EMAIL}`,
            )
          }
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() =>
            navigate(
              `/admin/applications?roundStatus=${RoundStatus.PENDING_EMAIL}`,
            )
          }
        >
          Back to Pending Email
        </Typography>
      </Box>

      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Send Email
      </Typography>

      <Stack spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            <strong>From:</strong> {preview.fromEmail}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>To:</strong> {preview.toEmail}
          </Typography>
        </Box>

        <Alert severity="info">
          Only <code>{'{{firstName}}'}</code> is auto-filled. All other content
          is hardcoded in the template.
        </Alert>

        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            gutterBottom
          >
            Auto-filled variables
          </Typography>
          <Chip
            label="Insert firstName"
            onClick={() => insertVariable('firstName')}
            clickable
            size="small"
          />
        </Box>

        <TextField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
        />

        <TextField
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          minRows={10}
          fullWidth
          inputProps={{
            ref: bodyRef,
            style: { fontFamily: 'monospace' },
          }}
        />

        {sendError && <Alert severity="error">{sendError}</Alert>}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleSaveTemplate}
            disabled={saving || sending}
          >
            {saving ? 'Saving…' : 'Save Template'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSend}
            disabled={sending || saving}
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </Box>
      </Stack>

      <Snackbar
        open={snackbarMsg !== null}
        autoHideDuration={3000}
        onClose={() => setSnackbarMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarMsg(null)}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SendEmailPage;
