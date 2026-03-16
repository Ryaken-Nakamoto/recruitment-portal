import { Box, Typography } from '@mui/material';
import { formatRound } from '../pages/ApplicationsPage';
import { ApplicationRound } from '@api/dtos/enums';

export function InterviewRoundPlaceholder({ round }: { round: string }) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h6">
        {formatRound(round as ApplicationRound)} — Coming Soon
      </Typography>
      <Typography color="text.secondary">
        Interview round view is under construction.
      </Typography>
    </Box>
  );
}
