import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  FolderOpen, 
  ShoppingBag, 
  Ticket, 
  Users, 
  MessageSquare, 
  ClipboardList, 
  Database,
  Menu,
  LogOut 
} from 'lucide-react';

const links = [
  ['/admin', 'Dashboard', LayoutDashboard],
  ['/admin/books', 'Books', BookOpen],
  ['/admin/categories', 'Categories', FolderOpen],
  ['/admin/orders', 'Orders', ShoppingBag],
  ['/admin/vouchers', 'Voucher Rules', Ticket],
  ['/admin/users', 'Users', Users],
  ['/admin/reviews', 'Reviews', MessageSquare],
  ['/admin/inventory', 'Inventory Management', ClipboardList],
  ['/admin/rag', 'RAG Catalog', Database],
];

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`admin-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: '20px' }}>
          {!collapsed && <h2 style={{ margin: 0 }}>Admin</h2>}
          <button 
            onClick={toggleSidebar} 
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-alt)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Menu size={20} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {links.map(([to, label, Icon]) => (
            <NavLink 
              key={to} 
              to={to} 
              end={to === '/admin'}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '12px' : '10px 16px'
              }}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
        <div style={{ padding: '20px 0', borderTop: '1px solid var(--border)' }}>
          <button 
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '8px', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'transparent', border: 'none', 
              color: '#f87171', cursor: 'pointer',
              padding: collapsed ? '12px' : '8px', width: '100%',
              fontSize: '1rem', textAlign: 'left', borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
}
