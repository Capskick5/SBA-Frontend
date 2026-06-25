export default function Input({ label, error, ...props }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
