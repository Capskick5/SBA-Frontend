export default function Button({ children, loading, ...props }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
}
