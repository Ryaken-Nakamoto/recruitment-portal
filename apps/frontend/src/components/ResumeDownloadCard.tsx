import { useState } from 'react';
import { Card, CardActionArea, Box, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import apiClient from '@api/apiClient';

interface ResumeDownloadCardProps {
  applicationId: number;
}

const ResumeDownloadCard: React.FC<ResumeDownloadCardProps> = ({
  applicationId,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await apiClient.downloadResume(applicationId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 280 }}>
      <CardActionArea
        onClick={handleClick}
        disabled={loading}
        data-testid="resume-download-btn"
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
          }}
        >
          <DescriptionIcon color="primary" />
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            Resume
          </Typography>
          <DownloadIcon fontSize="small" color="action" />
        </Box>
      </CardActionArea>
    </Card>
  );
};

export default ResumeDownloadCard;
