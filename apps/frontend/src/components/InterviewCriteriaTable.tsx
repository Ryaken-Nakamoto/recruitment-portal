import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { InterviewCriteriaDto } from '@api/dtos/rubric.dto';

interface Props {
  criteria: InterviewCriteriaDto[];
}

export const InterviewCriteriaTable: React.FC<Props> = ({ criteria }) => {
  if (criteria.length === 0) {
    return <Typography color="text.secondary">No criteria defined.</Typography>;
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Name</TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>
            Question
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>
            Criteria
          </TableCell>
          <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>
            Max Score
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {criteria.map((c) => (
          <TableRow key={c.id} sx={{ verticalAlign: 'top' }}>
            <TableCell>{c.name}</TableCell>
            <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{c.question}</TableCell>
            <TableCell sx={{ whiteSpace: 'pre-wrap' }}>{c.criteria}</TableCell>
            <TableCell>{c.maxScore}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
