export function AdminFilterField({ label, children, className = '' }) {
  return (
    <label className={`admin-filter-field ${className}`.trim()}>
      {label ? <span>{label}</span> : null}
      {children}
    </label>
  );
}

export default function AdminToolbar({ children, className = '', end }) {
  return (
    <div className={`admin-toolbar ${className}`.trim()}>
      <div className="admin-toolbar-start">{children}</div>
      {end ? <div className="admin-toolbar-end">{end}</div> : null}
    </div>
  );
}
