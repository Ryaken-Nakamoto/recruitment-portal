import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

import apiClient from '@api/apiClient';
import { User } from '@api/dtos/user.dto';

interface CompleteProfileModalProps {
  open: boolean;
  user?: User;
  onComplete: (user: User) => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  open,
  user,
  onComplete,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [touched, setTouched] = useState({ firstName: false, lastName: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setTouched({ firstName: false, lastName: false });
      setError(false);
    }
  }, [open, user]);

  const firstNameError =
    touched.firstName && !firstName.trim()
      ? 'First name is required'
      : undefined;
  const lastNameError =
    touched.lastName && !lastName.trim() ? 'Last name is required' : undefined;

  const handleSubmit = async () => {
    setTouched({ firstName: true, lastName: true });
    if (!firstName.trim() || !lastName.trim()) return;

    setSaving(true);
    setError(false);
    try {
      const updated = await apiClient.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      onComplete(updated);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={() => {}}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Complete Your Profile</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          Please enter your name to get started.
        </Typography>
        {error && (
          <Alert severity="error">Failed to save. Please try again.</Alert>
        )}
        <TextField
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
          error={!!firstNameError}
          helperText={firstNameError}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
          error={!!lastNameError}
          helperText={lastNameError}
          required
          fullWidth
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : null}
          sx={{ mt: 1 }}
        >
          {saving ? 'Saving...' : 'Submit'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteProfileModal;
