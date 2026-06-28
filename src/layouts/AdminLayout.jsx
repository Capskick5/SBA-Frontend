import { NavLink } from 'react-router-dom';

const links = [
  ['/admin', 'Dashboard'],
  ['/admin/books', 'Books'],
  ['/admin/categories', 'Categories'],
  ['/admin/orders', 'Orders'],
  ['/admin/users', 'Users'],
  ['/admin/reviews', 'Reviews'],
  ['/', 'Main Page'],
];

export default function AdminLayout({ children }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h2>Admin</h2>
        {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'}>{label}</NavLink>)}
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
