import { Checkbox, TableCell, TableRow } from '@mui/material';
import { ApplicationListItemDto } from '@api/dtos/application.dto';
import { RecruiterAssignmentDto } from '@api/dtos/assignment.dto';
import { ApplicationRound, AcademicYear } from '@api/dtos/enums';
import { formatRound, formatAcademicYear } from '../pages/ApplicationsPage';
import { ReviewProgressBadge } from './ReviewProgressBadge';
import { RoundStatusBadge } from './RoundStatusBadge';

type AdminApp = ApplicationListItemDto;
type RecruiterApp = RecruiterAssignmentDto;

interface AdminRowProps {
  role: 'admin';
  app: AdminApp;
  showAvgScore?: boolean;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  onClick: () => void;
}

interface RecruiterRowProps {
  role: 'recruiter';
  app: RecruiterApp;
  onClick: () => void;
}

type Props = AdminRowProps | RecruiterRowProps;

export const ApplicationRow: React.FC<Props> = (props) => {
  if (props.role === 'admin') {
    const {
      app,
      showAvgScore = false,
      selected = false,
      onSelect,
      onClick,
    } = props;
    const a = app as AdminApp;
    const reviewsTotal = a.reviewsTotal ?? 0;
    const reviewsSubmitted = a.reviewsSubmitted ?? 0;
    return (
      <TableRow
        hover
        sx={{
          cursor: 'pointer',
          backgroundColor: selected ? 'action.selected' : undefined,
        }}
        onClick={onClick}
      >
        <TableCell>{a.applicant.name}</TableCell>
        <TableCell>{a.applicant.email}</TableCell>
        <TableCell>{a.applicant.major}</TableCell>
        <TableCell>
          {formatAcademicYear(a.applicant.academicYear as AcademicYear)}
        </TableCell>
        <TableCell>{formatRound(a.round as ApplicationRound)}</TableCell>
        <TableCell>
          <RoundStatusBadge status={a.roundStatus} />
        </TableCell>
        <TableCell>
          {a.round === ApplicationRound.SCREENING ? (
            <ReviewProgressBadge
              submitted={reviewsSubmitted}
              total={reviewsTotal}
            />
          ) : null}
        </TableCell>
        {showAvgScore && (
          <TableCell>
            {a.averageScore != null ? a.averageScore.toFixed(2) : '—'}
          </TableCell>
        )}
        {onSelect && (
          <TableCell padding="checkbox">
            <Checkbox
              checked={selected}
              onChange={(e) => onSelect(a.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </TableCell>
        )}
      </TableRow>
    );
  }

  const { app, onClick } = props;
  const a = app as RecruiterApp;
  const reviewsTotal = a.application.reviewsTotal ?? 0;
  const reviewsSubmitted = a.application.reviewsSubmitted ?? 0;
  return (
    <TableRow hover sx={{ cursor: 'pointer' }} onClick={onClick}>
      <TableCell>{a.application.applicantName}</TableCell>
      <TableCell>
        {formatRound(a.application.round as ApplicationRound)}
      </TableCell>
      <TableCell>
        {a.application.round === ApplicationRound.SCREENING ? (
          <ReviewProgressBadge
            submitted={reviewsSubmitted}
            total={reviewsTotal}
          />
        ) : null}
      </TableCell>
    </TableRow>
  );
};
