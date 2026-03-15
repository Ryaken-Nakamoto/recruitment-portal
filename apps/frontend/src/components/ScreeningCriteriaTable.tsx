import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ScreeningCriteriaDto } from '@api/dtos/rubric.dto';

interface Props {
  criteria: ScreeningCriteriaDto[];
  scores?: Record<number, string>;
  onScoreChange?: (criteriaId: number, value: string) => void;
  errors?: Record<number, string>;
}

export const ScreeningCriteriaTable: React.FC<Props> = ({
  criteria,
  scores,
  onScoreChange,
  errors,
}) => {
  if (criteria.length === 0) {
    return <Typography color="text.secondary">No criteria defined.</Typography>;
  }

  const editable = !!onScoreChange;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Name</TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>
            1 — Meh
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>
            2 — Nice
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>
            3 — Amazing
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Score</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {criteria.map((c) => (
          <TableRow key={c.id} sx={{ verticalAlign: 'top' }}>
            <TableCell>{c.name}</TableCell>
            <TableCell>{c.oneDescription}</TableCell>
            <TableCell>{c.twoDescription}</TableCell>
            <TableCell>{c.threeDescription}</TableCell>
            <TableCell>
              {editable ? (
                <TextField
                  type="number"
                  size="small"
                  inputProps={{ min: 0, max: 3, step: 'any' }}
                  value={scores?.[c.id] ?? ''}
                  onChange={(e) => onScoreChange!(c.id, e.target.value)}
                  error={!!errors?.[c.id]}
                  helperText={errors?.[c.id]}
                  sx={{ width: 80 }}
                />
              ) : (
                <Typography variant="body2">{scores?.[c.id] ?? '—'}</Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
