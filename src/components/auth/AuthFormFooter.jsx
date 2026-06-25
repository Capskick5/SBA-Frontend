import { Link } from 'react-router-dom';
import { ERROR_MESSAGES } from '../../services/apiError';

export function AuthFormMessage({ error, success }) {
  if (success) {
    return <p className="form-message form-message-success">{success}</p>;
  }
  if (error) {
    const text = error.error_type
      ? ERROR_MESSAGES[error.error_type] || error.message
      : error.message;
    return <p className="form-message form-message-error">{text}</p>;
  }
  return null;
}

export function AuthFormFooter({ children }) {
  return <p className="auth-footer">{children}</p>;
}

export function AuthLink({ to, children }) {
  return <Link to={to}>{children}</Link>;
}
