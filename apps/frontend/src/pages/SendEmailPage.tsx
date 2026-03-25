import { useRef, useState, useEffect } from 'react';
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
import { marked } from 'marked';
import apiClient from '@api/apiClient';
import { RoundStatus } from '@api/dtos/enums';

marked.use({ breaks: true });

const SendEmailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const applicationId = parseInt(id ?? '0', 10);
  const navigate = useNavigate();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [initialized, setInitialized] = useState(false);
  // This page always shows a personalized email (variables already substituted).
  // Saving the template or inserting variables here would bake in the real name.
  const isPersonalized = true;
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const updatePreview = async (text: string) => {
    setBody(text);
    const html = await marked.parse(text);
    setHtmlPreview(html);
  };

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
  useEffect(() => {
    if (preview && !initialized) {
      setSubject(preview.subject);
      setBody(preview.body);
      const renderPreview = async () => {
        const html = await marked.parse(preview.body);
        setHtmlPreview(html);
      };
      renderPreview();
      setInitialized(true);
    }
  }, [preview, initialized]);

  const insertVariable = async (variable: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const token = `{{${variable}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + token + body.slice(end);
    setBody(newBody);
    const html = await marked.parse(newBody);
    setHtmlPreview(html as string);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      if (textarea.setSelectionRange) {
        textarea.setSelectionRange(pos, pos);
      }
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
    <Box sx={{ p: 4, width: '100%' }}>
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
          Variables like <code>{'{{firstName}}'}</code> have already been filled
          in. Edit the base template from the Emails page.
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
            clickable={!isPersonalized}
            disabled={isPersonalized}
            size="small"
          />
        </Box>

        <TextField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
        />

        <Box display="flex" gap={2}>
          <Box flex={1} minWidth={0}>
            <TextField
              label="Body"
              value={body}
              onChange={(e) => updatePreview(e.target.value)}
              multiline
              minRows={10}
              fullWidth
              slotProps={{
                htmlInput: {
                  ref: bodyRef,
                  style: { fontFamily: 'monospace' },
                },
              }}
              helperText="Tip: Use **text** for bold"
            />
          </Box>
          <Box
            flex={1}
            minWidth={0}
            border="1px solid rgba(0, 0, 0, 0.23)"
            borderRadius="4px"
            p={2}
            overflow="auto"
            minHeight="250px"
            sx={{
              backgroundColor: '#fafafa',
              fontFamily: 'Roboto, sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.43,
            }}
            dangerouslySetInnerHTML={{ __html: htmlPreview }}
          />
        </Box>

        {sendError && <Alert severity="error">{sendError}</Alert>}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleSaveTemplate}
            disabled={saving || sending || isPersonalized}
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
