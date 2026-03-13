import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import apiClient from '@api/apiClient';
import {
  FormYearDisplay,
  CollegeDisplay,
  CodingExperienceDisplay,
  HearAboutC4CDisplay,
} from '@api/dtos/application-detail.dto';
import {
  formatRound,
  formatRoundStatus,
  formatFinalDecision,
} from './ApplicationsPage';
import ResumeDownloadCard from '../components/ResumeDownloadCard';

const SHORT_ANSWER_QUESTIONS = [
  { key: 'whyC4C', label: 'Why are you interested in C4C?' },
  {
    key: 'selfStartedProject',
    label: 'Reflect on a project you self-started.',
  },
  {
    key: 'communityImpact',
    label: 'Describe a time when you made a positive impact on your community.',
  },
  {
    key: 'teamConflict',
    label:
      'Describe a time when you were working on a team and there was conflict.',
  },
  {
    key: 'otherExperiences',
    label:
      'Highlight or describe any other experiences you think are relevant.',
  },
] as const;

const DetailedApplicationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => apiClient.getApplicationDetail(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          Failed to load application details. Please try again.
        </Alert>
      </Box>
    );
  }

  const { applicant, rawGoogleForm } = data;

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <IconButton
          onClick={() => navigate('/admin/applications')}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="caption"
          component="span"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/admin/applications')}
        >
          Back to Applications
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
          <Chip label={formatRound(data.round)} size="small" />
          <Chip label={formatRoundStatus(data.roundStatus)} size="small" />
          {data.finalDecision && (
            <Chip
              label={formatFinalDecision(data.finalDecision)}
              size="small"
              color={data.finalDecision === 'accepted' ? 'success' : 'error'}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Submitted {new Date(data.submittedAt).toLocaleDateString()}
        </Typography>
      </Box>

      {/* Section 1: Applicant & Basic Info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Applicant Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Full Name
            </Typography>
            <Typography variant="body1">{rawGoogleForm.fullName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{rawGoogleForm.email}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Year
            </Typography>
            <Typography variant="body1">
              {FormYearDisplay[rawGoogleForm.year]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              College
            </Typography>
            <Typography variant="body1">
              {CollegeDisplay[rawGoogleForm.college]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Major
            </Typography>
            <Typography variant="body1">{rawGoogleForm.major}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Applied Before
            </Typography>
            <Typography variant="body1">
              {rawGoogleForm.appliedBefore}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <ResumeDownloadCard applicationId={data.id} />
          </Grid>
        </Grid>
      </Paper>

      {/* Section 2: Coding Experience */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Coding Experience
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          What experience do you have with coding?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {rawGoogleForm.codingExperience.map((exp) => (
            <Chip
              key={exp}
              label={CodingExperienceDisplay[exp]}
              size="small"
              variant="outlined"
            />
          ))}
          {rawGoogleForm.codingExperienceOther && (
            <Chip
              label={`Other: ${rawGoogleForm.codingExperienceOther}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Section 3: Short Answer Responses */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Short Answer Responses
        </Typography>
        {SHORT_ANSWER_QUESTIONS.map(({ key, label }) => {
          const answer = rawGoogleForm[key];
          if (!answer) return null;
          return (
            <Box key={key} sx={{ mb: 3, '&:last-child': { mb: 0 } }}>
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                sx={{ mb: 0.5 }}
              >
                {label}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {answer}
              </Typography>
            </Box>
          );
        })}
      </Paper>

      {/* Section 4: Additional Info */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Additional Information
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            How did you hear about C4C?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {rawGoogleForm.heardAboutC4C.map((source) => (
              <Chip
                key={source}
                label={HearAboutC4CDisplay[source]}
                size="small"
                variant="outlined"
              />
            ))}
            {rawGoogleForm.heardAboutC4COther && (
              <Chip
                label={`Other: ${rawGoogleForm.heardAboutC4COther}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            Please list your commitments for this Fall.
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {rawGoogleForm.fallCommitments}
          </Typography>
        </Box>

        {rawGoogleForm.questionsOrConcerns && (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Any questions or concerns?
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {rawGoogleForm.questionsOrConcerns}
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DetailedApplicationPage;
