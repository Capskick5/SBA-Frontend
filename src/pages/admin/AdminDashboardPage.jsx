import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true);
      setError('');
      return adminService.getStats()
        .then(setStats)
        .catch(() => setError('Could not load dashboard statistics.'))
        .finally(() => setLoading(false));
    });
  }, [reloadKey]);

  if (loading) return <LoadingState text="Loading dashboard..." />;
  if (error) return <ErrorState text={error}><Button onClick={() => setReloadKey((value) => value + 1)}>Try again</Button></ErrorState>;

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
