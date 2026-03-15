import { Chip } from '@mui/material';
import { RoundStatus } from '@api/dtos/enums';
import { formatRoundStatus } from '../pages/ApplicationsPage';

export const RoundStatusBadge: React.FC<{ status: RoundStatus }> = ({
  status,
}) => {
  if (
    status === RoundStatus.IN_PROGRESS ||
    status === RoundStatus.AWAITING_ADMIN
  ) {
    return (
      <Chip label={formatRoundStatus(status)} color="warning" size="small" />
    );
  }
  if (status === RoundStatus.EMAIL_SENT) {
    return (
      <Chip label={formatRoundStatus(status)} color="success" size="small" />
    );
  }
  return <Chip label={formatRoundStatus(status)} size="small" />;
};
