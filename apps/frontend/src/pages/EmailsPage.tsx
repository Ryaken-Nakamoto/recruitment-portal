import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import { FinalDecision } from '@api/dtos/enums';
import { EmailDto } from '@api/dtos/email.dto';
import EmailEditorDialog from '@components/EmailEditorDialog';

const STAGE_LABELS: Record<string, string> = {
  screening: 'Screening',
  technical_interview: 'Technical Interview',
  behavioral_interview: 'Behavioral Interview',
};

function EmailCard({
  email,
  onSelect,
}: {
  email: EmailDto;
  onSelect: (email: EmailDto) => void;
}) {
  const isAccepted = email.decision === FinalDecision.ACCEPTED;
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onSelect(email)}>
        <CardContent>
          <Stack direction="row" spacing={1} mb={1} alignItems="center">
            <Chip
              label={
                STAGE_LABELS[email.applicationStage] ?? email.applicationStage
              }
              size="small"
              variant="outlined"
            />
            <Chip
              label={isAccepted ? 'Accepted' : 'Rejected'}
              size="small"
              color={isAccepted ? 'success' : 'error'}
            />
          </Stack>
          <Typography variant="subtitle1" fontWeight="medium">
            {email.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {email.subject}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

const EmailsPage: React.FC = () => {
  const [selected, setSelected] = useState<EmailDto | null>(null);

  const {
    data: emails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['emails'],
    queryFn: () => apiClient.getEmails(),
  });

  const { data: autoVariables = [] } = useQuery({
    queryKey: ['emailVariables'],
    queryFn: () => apiClient.getEmailVariables(),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !emails) {
    return (
      <Box p={4}>
        <Typography color="error">Failed to load email templates.</Typography>
      </Box>
    );
  }

  const stages = [
    'screening',
    'technical_interview',
    'behavioral_interview',
  ] as const;

  return (
    <Box p={4}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Email Templates
      </Typography>

      <Stack spacing={4}>
        {stages.map((stage) => {
          const stageEmails = emails.filter(
            (e) => e.applicationStage === stage,
          );
          if (stageEmails.length === 0) return null;
          return (
            <Box key={stage}>
              <Typography variant="h6" mb={1}>
                {STAGE_LABELS[stage]}
              </Typography>
              <Stack spacing={1}>
                {stageEmails.map((email) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    onSelect={setSelected}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {selected && (
        <EmailEditorDialog
          email={selected}
          autoVariables={autoVariables}
          onClose={() => setSelected(null)}
        />
      )}
    </Box>
  );
};

export default EmailsPage;
