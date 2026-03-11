import { useRef, useState } from 'react';
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
import apiClient from '@api/apiClient';
import { EmailDto } from '@api/dtos/email.dto';

interface Props {
  email: EmailDto;
  autoVariables: string[];
  onClose: () => void;
}

const EmailEditorDialog: React.FC<Props> = ({
  email,
  autoVariables,
  onClose,
}) => {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => apiClient.updateEmail(email.id, { subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      setSnackbarOpen(true);
    },
  });

  const insertVariable = (variable: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const token = `{{${variable}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + token + body.slice(end);
    setBody(newBody);
    // Restore cursor after the inserted token
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{email.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Alert severity="info">
              Variables wrap any word in{' '}
              <code>
                {'{{'}
                {'}}'}{' '}
              </code>
              . Tier 1 variables below are filled automatically from the
              applicant&apos;s profile. To create your own Tier 2 variable (e.g.
              a Calendly link), type <code>{'{{calendlyLink}}'}</code> directly
              in the body — you&apos;ll be prompted to fill it in when sending.
            </Alert>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Tier 1 — auto-filled variables
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
