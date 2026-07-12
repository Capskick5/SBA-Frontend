import { AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', text = 'No data available.', children }) {
  return (
    <div className="state state-empty">
      <Inbox size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', text = 'Could not load data.', children }) {
  return (
    <div className="state state-error" role="alert">
      <AlertCircle size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  );
}
