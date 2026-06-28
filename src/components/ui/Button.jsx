export default function Button({ children, loading, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`btn ${className}`.trim()}
      disabled={props.disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}
