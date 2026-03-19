import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import apiClient from '@api/apiClient';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@api/dtos/enums';

const ProfilePage: React.FC = () => {
  const [, , user] = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  const homeRoute =
    user?.role === Role.ADMIN ? '/admin/home' : '/recruiter/home';

  const unchanged =
    firstName === (user?.firstName ?? '') &&
    lastName === (user?.lastName ?? '');
  const saveDisabled = saving || unchanged;

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateProfile({ firstName, lastName });
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to save profile. Please try again.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* Banner */}
      <Box
        sx={{
          background:
            'linear-gradient(135deg, rgba(76,99,210,0.88) 0%, rgba(96,90,205,0.85) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.30)',
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
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '28px solid rgba(183,114,234,0.35)',
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
            border: '14px solid rgba(200,197,255,0.40)',
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
            sx={{ lineHeight: 1.15, mt: 0.25, color: 'white' }}
          >
            Recruitment Portal
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ opacity: 0.75, mt: 0.5, fontWeight: 500 }}
          >
            {user?.role === Role.ADMIN ? 'Admin' : 'Recruiter'} — Account Info
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 4, maxWidth: 600 }}>
        <Box sx={{ mb: 3 }}>
          <IconButton
            onClick={() => navigate(homeRoute)}
            sx={{ mr: 1 }}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="caption"
            component="span"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigate(homeRoute)}
          >
            Back to Home
          </Typography>
        </Box>

        <Typography variant="h5" fontWeight="bold" mb={3}>
          Account Info
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            value={user?.email ?? ''}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="Role"
            value={user?.role ?? ''}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="Account Status"
            value={user?.accountStatus ?? ''}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          <TextField
            label="Member Since"
            value={
              user?.createdDate
                ? new Date(user.createdDate).toLocaleDateString()
                : ''
            }
            InputProps={{ readOnly: true }}
            fullWidth
          />

          <Box>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saveDisabled}
              startIcon={<SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfilePage;
