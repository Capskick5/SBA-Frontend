export default function Input({ label, ...props }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input {...props} />
    </label>
  );
}
