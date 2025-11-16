// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger">
            <h2>⚠️ Terjadi Kesalahan</h2>
            <p>Maaf, terjadi error pada aplikasi. Silakan refresh halaman.</p>

            {process.env.NODE_ENV === 'development' && (
              <details style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                <summary>Error Details (Development)</summary>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </details>
            )}

            <div className="mt-3">
              <button
                className="btn btn-primary me-2"
                onClick={this.handleReload}
              >
                Refresh Halaman
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={this.handleReset}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
