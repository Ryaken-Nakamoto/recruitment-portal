import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ScreeningCriteriaDto } from '@api/dtos/rubric.dto';

interface Props {
  criteria: ScreeningCriteriaDto[];
}

export const ScreeningCriteriaTable: React.FC<Props> = ({ criteria }) => {
  if (criteria.length === 0) {
    return <Typography color="text.secondary">No criteria defined.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Name</TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>
            1 — Meh
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '28%' }}>
            2 — Nice
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '29%' }}>
            3 — Amazing
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {criteria.map((c) => (
          <TableRow key={c.id} sx={{ verticalAlign: 'top' }}>
            <TableCell>{c.name}</TableCell>
            <TableCell>{c.oneDescription}</TableCell>
            <TableCell>{c.twoDescription}</TableCell>
            <TableCell>{c.threeDescription}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
