import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import apiClient from '@api/apiClient';
import { ScreeningRubricDto, InterviewRubricDto } from '@api/dtos/rubric.dto';
import { ScreeningCriteriaTable } from '@components/ScreeningCriteriaTable';
import { InterviewCriteriaTable } from '@components/InterviewCriteriaTable';

type SelectedRubric =
  | { type: 'screening'; rubric: ScreeningRubricDto }
  | { type: 'interview'; rubric: InterviewRubricDto }
  | null;

const RubricsPage: React.FC = () => {
  const [selected, setSelected] = useState<SelectedRubric>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rubrics'],
    queryFn: () => apiClient.getRubrics(),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box p={4}>
        <Typography color="error">Failed to load rubrics.</Typography>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        Rubrics
      </Typography>

      <Typography variant="h6" mb={1}>
        Screening
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2} mb={4}>
        {data.screening.map((rubric) => (
          <Button
            key={rubric.id}
            variant="outlined"
            onClick={() => setSelected({ type: 'screening', rubric })}
          >
            {rubric.name}
          </Button>
        ))}
      </Box>

      <Typography variant="h6" mb={1}>
        Interview
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        {data.interview.map((rubric) => (
          <Button
            key={rubric.id}
            variant="outlined"
            onClick={() => setSelected({ type: 'interview', rubric })}
          >
            {rubric.name}
          </Button>
        ))}
      </Box>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        maxWidth="xl"
        fullWidth
      >
        {selected && (
          <>
            <DialogTitle>{selected.rubric.name}</DialogTitle>
            <DialogContent>
              {selected.type === 'screening' ? (
                <ScreeningCriteriaTable criteria={selected.rubric.criteria} />
              ) : (
                <InterviewCriteriaTable criteria={selected.rubric.criteria} />
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default RubricsPage;
