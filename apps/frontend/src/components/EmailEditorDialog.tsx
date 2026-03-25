import { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { marked } from 'marked';
import apiClient from '@api/apiClient';
import { EmailDto } from '@api/dtos/email.dto';

interface Props {
  email: EmailDto;
  autoVariables: string[];
  onClose: () => void;
}

marked.use({ breaks: true });

const EmailEditorDialog: React.FC<Props> = ({
  email,
  autoVariables,
  onClose,
}) => {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Initialize preview on mount
  useEffect(() => {
    const renderPreview = async () => {
      const html = await marked.parse(email.body);
      setHtmlPreview(html);
    };
    renderPreview();
  }, [email.body]);

  // Update HTML preview when body changes
  const updatePreview = async (text: string) => {
    setBody(text);
    const html = await marked.parse(text);
    setHtmlPreview(html);
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => apiClient.updateEmail(email.id, { subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setSnackbarOpen(true);
    },
  });

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
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      if (textarea.setSelectionRange) {
        textarea.setSelectionRange(pos, pos);
      }
    });
  };

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        fullWidth
        maxWidth={false}
        sx={{ '& .MuiDialog-paper': { margin: 2 } }}
      >
        <DialogTitle>{email.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              Click below to insert <code>{'{{firstName}}'}</code> into your
              template. It will be automatically filled with the
              applicant&apos;s first name when the email is sent.
            </Alert>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Auto-filled variables
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {autoVariables.map((v) => (
                  <Chip
                    key={v}
                    label={`Insert ${v.replace(/([A-Z])/g, ' $1').trim()}`}
                    onClick={() => insertVariable(v)}
                    clickable
                    size="small"
                  />
                ))}
              </Stack>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => save()}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbarOpen(false)}>
          Template saved successfully.
        </Alert>
      </Snackbar>
    </>
  );
};

export default EmailEditorDialog;
