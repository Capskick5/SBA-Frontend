export function LoadingState({ text = 'Loading...' }) {
  return <div className="state">{text}</div>;
}

export function EmptyState({ text = 'No data available.' }) {
  return <div className="state">{text}</div>;
}

export function ErrorState({ text = 'Could not load data.' }) {
  return <div className="state state-error">{text}</div>;
}
