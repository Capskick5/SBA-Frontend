export default function Input({ label, error, ...props }) {
  return (
    <label className={`field${error ? ' field-invalid' : ''}`}>
      {label && <span>{label}</span>}
      <input aria-invalid={error ? 'true' : undefined} {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
