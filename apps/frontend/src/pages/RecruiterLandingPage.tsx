import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Paper, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from 'aws-amplify/auth';

const C4C_PURPLE = '#605ACD';
const C4C_BLUE = '#4C63D2';

const CARDS = [
  {
    icon: <AssignmentIcon sx={{ fontSize: 42 }} />,
    iconColor: C4C_PURPLE,
    accentColor: C4C_PURPLE,
    title: 'My Applications',
    description: 'Review your assigned applications',
    route: '/recruiter/applications',
  },
  {
    icon: <AccountCircleIcon sx={{ fontSize: 42 }} />,
    iconColor: C4C_BLUE,
    accentColor: C4C_BLUE,
    title: 'Account Info',
    description: 'View and edit your profile information',
    route: '/recruiter/profile',
  },
];

const RecruiterLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Box>
      {/* Banner */}
      <Box
        sx={{
          background:
            'linear-gradient(135deg, rgba(76,99,210,0.88) 0%, rgba(96,90,205,0.85) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.18)',
          color: 'white',
          px: 4,
          py: 5.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '28px solid rgba(236, 72, 153, 0.35)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: 150,
            width: 90,
            height: 90,
            borderRadius: '50%',
            border: '14px solid rgba(129, 140, 248, 0.4)',
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Typography
            variant="overline"
            sx={{
              opacity: 0.7,
              letterSpacing: 3,
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            Code4Community
          </Typography>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ lineHeight: 1.15, mt: 0.25 }}
          >
            Recruitment Portal
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ opacity: 0.75, mt: 0.5, fontWeight: 500 }}
          >
            Recruiter Dashboard
          </Typography>
        </Box>
        <Button
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          sx={{
            position: 'relative',
            color: 'white',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 2,
            px: 2.5,
            '&:hover': {
              background: 'rgba(255,255,255,0.20)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: 'none',
            },
          }}
        >
          Logout
        </Button>
      </Box>

      {/* Cards grid */}
      <Box sx={{ p: 4 }}>
        <Grid container spacing={2.5}>
          {CARDS.map((card) => (
            <Grid size={{ xs: 12, sm: 6 }} key={card.route}>
              <Paper
                elevation={0}
                onClick={() => navigate(card.route)}
                sx={{
                  p: 3,
                  cursor: 'pointer',
                  borderTop: `4px solid ${card.accentColor}`,
                  border: '1.5px solid var(--glass-border-dark)',
                  boxShadow: '4px 4px var(--glass-border-dark)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translate(-2px, -2px)',
                    boxShadow: '6px 6px var(--glass-border-dark)',
                  },
                  '&:active': {
                    transform: 'translate(2px, 2px)',
                    boxShadow: '2px 2px var(--glass-border-dark)',
                  },
                }}
              >
                <Box sx={{ color: card.iconColor, mb: 1.5 }}>{card.icon}</Box>
                <Typography variant="h6" sx={{ color: '#333333' }}>
                  {card.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: '#9A98A2', mt: 0.5, lineHeight: 1.5 }}
                >
                  {card.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default RecruiterLandingPage;
