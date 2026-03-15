import { createTheme } from '@mui/material/styles';

// C4C brand colors — sourced from c4cneuv2 repo
// #605ACD  c4cPurple  · #4C63D2  blue-purple
// #2A77F4  vivid blue · #B772EA  purple-pink
// #4A4A51  shadow     · #333333  text
// Font: IBM Plex Sans

const theme = createTheme({
  palette: {
    primary: {
      main: '#605ACD',
      dark: '#4C63D2',
      light: '#C8C5FF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#B772EA',
      dark: '#8B3FBE',
      light: '#EED2FF',
      contrastText: '#FFFFFF',
    },
    background: {
      default: 'transparent',
      paper: 'rgba(255, 255, 255, 0.60)',
    },
    text: {
      primary: '#333333',
      secondary: '#9A98A2',
    },
  },
  typography: {
    fontFamily:
      '"IBM Plex Sans", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.3px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { background: 'transparent' } },
    },

    // ── Buttons ──────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'var(--glass-bg-primary)',
          backdropFilter: 'blur(var(--glass-blur-mid))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-mid))',
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: '3px 3px #4A4A51',
          '&:hover': {
            background: 'var(--glass-bg-primary-mid)',
            boxShadow: '2px 2px #4A4A51',
          },
          '&:active': { boxShadow: '1px 1px #4A4A51' },
        },
        outlinedPrimary: {
          background: 'rgba(96, 90, 205, 0.08)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderColor: '#605ACD',
          '&:hover': { background: 'rgba(96, 90, 205, 0.15)' },
        },
      },
    },

    // ── Paper — mid glass. Outlined = far glass (more color shows through) ───
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'var(--glass-bg-mid)',
          backdropFilter: 'blur(var(--glass-blur-mid))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-mid))',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-highlight), var(--glass-shadow)',
        },
        outlined: {
          background: 'var(--glass-bg-far)',
          backdropFilter: 'blur(var(--glass-blur-far))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-far))',
          borderColor: 'var(--glass-border)',
          boxShadow: 'var(--glass-highlight)',
        },
      },
    },

    // Dialogs closest to user — most opaque
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'var(--glass-bg-near) !important',
          backdropFilter: 'blur(var(--glass-blur-near))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-near))',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-highlight), var(--glass-shadow-near)',
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          background: 'var(--glass-bg-near) !important',
          backdropFilter: 'blur(var(--glass-blur-mid))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-mid))',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-highlight), var(--glass-shadow)',
        },
      },
    },

    // ── Inputs ───────────────────────────────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        },
        notchedOutline: {
          borderColor: 'var(--glass-border)',
        },
      },
    },

    // ── Tables ───────────────────────────────────────────────────────────────
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            background: 'var(--glass-bg-primary-mid)',
            backdropFilter: 'blur(var(--glass-blur-far))',
            WebkitBackdropFilter: 'blur(var(--glass-blur-far))',
            color: 'rgba(255, 255, 255, 0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.30)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.1s',
          '&:hover': { backgroundColor: 'rgba(96, 90, 205, 0.06)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.50)',
          color: '#333333',
        },
      },
    },

    // ── Chips ────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        },
        filled: {
          background: 'rgba(255,255,255,0.65)',
          border: '1px solid rgba(255,255,255,0.70)',
          color: '#333333',
        },
      },
    },

    // ── Tabs ─────────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid rgba(255,255,255,0.60)',
        },
        indicator: { backgroundColor: '#605ACD', height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          color: 'rgba(51,51,51,0.65)',
          '&.Mui-selected': { color: '#605ACD' },
        },
      },
    },

    // ── Alerts / Snackbars ───────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: 'rgba(255,255,255,0.70)',
          border: '1px solid var(--glass-border)',
        },
      },
    },
  },
});

export default theme;
