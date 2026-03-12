import { Card, CardActionArea, Box, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface ResumeDownloadCardProps {
  resumeUrl: string;
}

const ResumeDownloadCard: React.FC<ResumeDownloadCardProps> = ({
  resumeUrl,
}) => {
  const handleClick = () => {
    window.open(resumeUrl, '_blank');
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 280 }}>
      <CardActionArea onClick={handleClick} data-testid="resume-download-btn">
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
          <OpenInNewIcon fontSize="small" color="action" />
        </Box>
      </CardActionArea>
    </Card>
  );
};

export default ResumeDownloadCard;
