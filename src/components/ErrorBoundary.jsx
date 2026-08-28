import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/**
 * Last-resort error boundary: if rendering the app throws (for example on
 * unexpected data), it shows a short message and offers a reload instead of
 * leaving a blank page.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('The application crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          role="alert"
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            px: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" component="h1">
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The app hit an unexpected error. Reloading usually fixes it – your
            tasks are stored in this browser and will not be lost.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
