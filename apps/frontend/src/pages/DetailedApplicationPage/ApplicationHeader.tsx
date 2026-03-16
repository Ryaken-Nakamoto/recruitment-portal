import { Box, Chip, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import {
  formatRound,
  formatRoundStatus,
  formatFinalDecision,
} from '../ApplicationsPage';
import { ApplicationRound, FinalDecision, RoundStatus } from '@api/dtos/enums';

interface ApplicationHeaderProps {
  applicant: { name: string; email: string };
  round: ApplicationRound;
  roundStatus: RoundStatus;
  finalDecision: FinalDecision | null;
  submittedAt: string;
  backPath: string;
  backLabel: string;
}

export function ApplicationHeader({
  applicant,
  round,
  roundStatus,
  finalDecision,
  submittedAt,
  backPath,
  backLabel,
}: ApplicationHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <IconButton
          onClick={() => navigate(backPath)}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(backPath)}
        >
          {backLabel}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          {applicant.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {applicant.email}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip label={formatRound(round)} size="small" />
          <Chip label={formatRoundStatus(roundStatus)} size="small" />
          {finalDecision && (
            <Chip
              label={formatFinalDecision(finalDecision)}
              size="small"
              color={finalDecision === 'accepted' ? 'success' : 'error'}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Submitted {new Date(submittedAt).toLocaleDateString()}
        </Typography>
      </Box>
    </>
  );
}
