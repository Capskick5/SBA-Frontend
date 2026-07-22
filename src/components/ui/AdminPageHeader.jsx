export default function AdminPageHeader({ title, subtitle, kicker, actions, children }) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-text">
        {kicker ? <span className="admin-page-kicker">{kicker}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
    </header>
  );
}
