export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="state">
      <div className="spinner"></div>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  );
}

export function EmptyState({ text = 'No data available.' }) {
  return <div className="state">{text}</div>;
}

export function ErrorState({ text = 'Could not load data.', children }) {
  return (
    <div className="state state-error">
      <p>{text}</p>
      {children}
    </div>
  );
}
