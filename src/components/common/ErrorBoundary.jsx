import { Component } from 'react';
import { ErrorState } from '../ui/State';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState text="An unexpected error occurred. Please reload the page.">
          <button className="btn" type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </ErrorState>
      );
    }
    return this.props.children;
  }
}
