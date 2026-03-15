import { Chip, Typography } from '@mui/material';

interface Props {
  submitted: number;
  total: number;
}

export const ReviewProgressBadge: React.FC<Props> = ({ submitted, total }) => {
  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  }

  const label = `${submitted}/${total}`;
  if (submitted === total) {
    return <Chip label={label} color="success" size="small" />;
  }
  if (submitted > 0) {
    return <Chip label={label} color="warning" size="small" />;
  }
  return <Chip label={label} size="small" />;
};
