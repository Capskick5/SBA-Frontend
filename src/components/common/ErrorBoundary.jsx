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
        <ErrorState text="Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang.">
          <button className="btn" type="button" onClick={() => window.location.reload()}>
            Tải lại
          </button>
        </ErrorState>
      );
    }
    return this.props.children;
  }
}
