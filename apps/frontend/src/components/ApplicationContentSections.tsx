import { Box, Chip, Grid, Paper, Typography } from '@mui/material';
import {
  FormYearDisplay,
  CollegeDisplay,
  CodingExperienceDisplay,
  HearAboutC4CDisplay,
  FormYear,
  College,
  CodingExperience,
  HearAboutC4C,
  RawGoogleFormDto,
} from '@api/dtos/application-detail.dto';
import ResumeDownloadCard from './ResumeDownloadCard';

const SHORT_ANSWER_QUESTIONS = [
  { key: 'whyC4C' as const, label: 'Why are you interested in C4C?' },
  {
    key: 'selfStartedProject' as const,
    label: 'Reflect on a project you self-started.',
  },
  {
    key: 'communityImpact' as const,
    label: 'Describe a time when you made a positive impact on your community.',
  },
  {
    key: 'teamConflict' as const,
    label:
      'Describe a time when you were working on a team and there was conflict.',
  },
  {
    key: 'otherExperiences' as const,
    label:
      'Highlight or describe any other experiences you think are relevant.',
  },
];

interface Props {
  applicationId: number;
  rawGoogleForm: RawGoogleFormDto;
  showResume?: boolean;
}

export function ApplicationContentSections({
  applicationId,
  rawGoogleForm,
  showResume = true,
}: Props) {
  const form = rawGoogleForm;

  return (
    <>
      {/* Applicant Information */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Applicant Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Full Name
            </Typography>
            <Typography variant="body1">{form.fullName}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{form.email}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Year
            </Typography>
            <Typography variant="body1">
              {FormYearDisplay[form.year as FormYear]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              College
            </Typography>
            <Typography variant="body1">
              {CollegeDisplay[form.college as College]}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Major
            </Typography>
            <Typography variant="body1">{form.major}</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Applied Before
            </Typography>
            <Typography variant="body1">{form.appliedBefore}</Typography>
          </Grid>
          {showResume && (
            <Grid size={{ xs: 12 }}>
              <ResumeDownloadCard applicationId={applicationId} />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Coding Experience */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Coding Experience
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          What experience do you have with coding?
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {form.codingExperience.map((exp) => (
            <Chip
              key={exp}
              label={CodingExperienceDisplay[exp as CodingExperience]}
              size="small"
              variant="outlined"
            />
          ))}
          {form.codingExperienceOther && (
            <Chip
              label={`Other: ${form.codingExperienceOther}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Short Answer Responses */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Short Answer Responses
        </Typography>
        {SHORT_ANSWER_QUESTIONS.map(({ key, label }) => {
          const answer = form[key];
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

      {/* Additional Information */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Additional Information
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            How did you hear about C4C?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {form.heardAboutC4C.map((source) => (
              <Chip
                key={source}
                label={HearAboutC4CDisplay[source as HearAboutC4C]}
                size="small"
                variant="outlined"
              />
            ))}
            {form.heardAboutC4COther && (
              <Chip
                label={`Other: ${form.heardAboutC4COther}`}
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
            {form.fallCommitments}
          </Typography>
        </Box>

        {form.questionsOrConcerns && (
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
              Any questions or concerns?
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {form.questionsOrConcerns}
            </Typography>
          </Box>
        )}
      </Paper>
    </>
  );
}
