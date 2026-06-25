export default function Select({ label, children, ...props }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select {...props}>{children}</select>
    </label>
  );
}
