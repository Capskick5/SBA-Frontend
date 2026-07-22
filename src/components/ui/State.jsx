import { AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ text = 'Đang tải...' }) {
  return (
    <div className="state state-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true"></div>
      <p>{text}</p>
    </div>
  );
}

export function EmptyState({ title = 'Chưa có nội dung', text = 'Không có dữ liệu.', children }) {
  return (
    <div className="state state-empty">
      <Inbox size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function ErrorState({ title = 'Đã xảy ra lỗi', text = 'Không thể tải dữ liệu.', children }) {
  return (
    <div className="state state-error" role="alert">
      <AlertCircle size={30} aria-hidden="true" />
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  );
}
