import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

import apiClient from '@api/apiClient';

interface InviteRecruiterModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  onError: () => void;
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required';
  if (!values.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Must be a valid email address';
  }
  return errors;
}

const InviteRecruiterModal: React.FC<InviteRecruiterModalProps> = ({
  open,
  onClose,
  onSuccess,
  onError,
}) => {
  const [values, setValues] = useState<FormValues>({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormValues, boolean>>
  >({});
  const [conflictError, setConflictError] = useState(false);

  const errors = validate(values);
  const isValid = Object.keys(errors).length === 0;

  const { mutate, isPending } = useMutation({
    mutationFn: () => apiClient.inviteRecruiter(values),
    onSuccess: () => {
      onSuccess(values.email);
      handleClose();
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setConflictError(true);
      } else {
        onError();
        handleClose();
      }
    },
  });

  const handleClose = () => {
    setValues({ firstName: '', lastName: '', email: '' });
    setTouched({});
    setConflictError(false);
    onClose();
  };

  const handleSubmit = () => {
    setTouched({ firstName: true, lastName: true, email: true });
    if (!isValid) return;
    setConflictError(false);
    mutate();
  };

  const handleChange =
    (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === 'email') setConflictError(false);
    };

  const handleBlur = (field: keyof FormValues) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Invite Recruiter</DialogTitle>
      <DialogContent
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}
      >
        {conflictError && (
          <Alert severity="error">
            A recruiter with this email already exists
          </Alert>
        )}
        <TextField
          label="First Name"
          value={values.firstName}
          onChange={handleChange('firstName')}
          onBlur={handleBlur('firstName')}
          error={touched.firstName && !!errors.firstName}
          helperText={touched.firstName ? errors.firstName : ''}
          required
          fullWidth
        />
        <TextField
          label="Last Name"
          value={values.lastName}
          onChange={handleChange('lastName')}
          onBlur={handleBlur('lastName')}
          error={touched.lastName && !!errors.lastName}
          helperText={touched.lastName ? errors.lastName : ''}
          required
          fullWidth
        />
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          error={touched.email && !!errors.email}
          helperText={touched.email ? errors.email : ''}
          required
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={16} /> : null}
        >
          Send Invite
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteRecruiterModal;
