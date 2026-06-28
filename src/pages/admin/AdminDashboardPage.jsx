import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminService.getStats().then(setStats);
  }, []);

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <section className="stack">
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="panel"><strong>Users</strong><p>{stats.totalUsers}</p></div>
        <div className="panel"><strong>Books</strong><p>{stats.totalBooks}</p></div>
        <div className="panel"><strong>Orders</strong><p>{stats.totalOrders}</p></div>
        <div className="panel"><strong>Revenue</strong><p>{formatCurrency(stats.recognizedRevenue)}</p></div>
      </div>
    </section>
  );
}
