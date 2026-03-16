import { Box, Button, Typography } from '@mui/material';
import { RoundStatus } from '@api/dtos/enums';

interface BulkActionBarProps {
  mode: RoundStatus.AWAITING_ADMIN | RoundStatus.PENDING_EMAIL;
  selectedCount: number;
  deciding: boolean;
  sendingEmails: boolean;
  revertingEmails: boolean;
  onAdvance: () => void;
  onReject: () => void;
  onSendEmails: () => void;
  onRevert: () => void;
}

export function BulkActionBar({
  mode,
  selectedCount,
  deciding,
  sendingEmails,
  revertingEmails,
  onAdvance,
  onReject,
  onSendEmails,
  onRevert,
}: BulkActionBarProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1200,
      }}
    >
      {mode === RoundStatus.AWAITING_ADMIN ? (
        <>
          <Button
            variant="contained"
            color="error"
            disabled={deciding}
            onClick={onReject}
          >
            Reject
          </Button>
          <Typography>
            {selectedCount > 0 ? `${selectedCount} selected` : 'No selection'}
          </Typography>
          <Button
            variant="contained"
            color="success"
            disabled={deciding}
            onClick={onAdvance}
          >
            Advance
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="contained"
            color="warning"
            disabled={revertingEmails}
            onClick={onRevert}
          >
            Move back to Pending Admin
          </Button>
          <Typography>
            {selectedCount > 0 ? `${selectedCount} selected` : 'No selection'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            disabled={sendingEmails}
            onClick={onSendEmails}
          >
            Send Emails
          </Button>
        </>
      )}
    </Box>
  );
}
