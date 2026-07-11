import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const links = [
  ['/admin', 'Dashboard'],
  ['/admin/books', 'Books'],
  ['/admin/categories', 'Categories'],
  ['/admin/orders', 'Orders'],
  ['/admin/vouchers', 'Voucher Rules'],
  ['/admin/users', 'Users'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/inventory', 'Inventory Management'],
  ['/admin/rag', 'RAG Catalog'],
];

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <h2>Admin</h2>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/admin'}>{label}</NavLink>)}
        </div>
        <div style={{ padding: '20px 0', borderTop: '1px solid #333' }}>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'transparent', border: 'none', 
              color: '#f87171', cursor: 'pointer',
              padding: '8px', width: '100%',
              fontSize: '1rem', textAlign: 'left', borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
