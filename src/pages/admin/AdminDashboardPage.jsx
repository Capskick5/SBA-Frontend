import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Gọi API thống kê thực tế
    adminService.getStats().then(setStats);
  }, []);

  if (!stats) return <p>Đang tải dữ liệu dashboard...</p>;

  return (
    <section className="stack">
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="panel"><strong>Người dùng</strong><p>{stats.totalUsers}</p></div>
        <div className="panel"><strong>Sách</strong><p>{stats.totalBooks}</p></div>
        <div className="panel"><strong>Đơn hàng</strong><p>{stats.totalOrders}</p></div>
        <div className="panel"><strong>Doanh thu</strong><p>{formatCurrency(stats.recognizedRevenue)}</p></div>
      </div>
    </section>
  );
}