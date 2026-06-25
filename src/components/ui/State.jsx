export function LoadingState({ text = 'Dang tai...' }) {
  return <div className="state">{text}</div>;
}

export function EmptyState({ text = 'Chua co du lieu.' }) {
  return <div className="state">{text}</div>;
}

export function ErrorState({ text = 'Khong the tai du lieu.' }) {
  return <div className="state state-error">{text}</div>;
}
