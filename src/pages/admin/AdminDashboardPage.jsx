import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';
import {
  buildDailySeries,
  extractPagedItems,
  getOrderStatuses,
  sumBooksSold,
} from '../../utils/adminDashboardStats';

const CHART_DAYS = 30;

function KpiCard({ label, value }) {
  return (
    <div className="panel admin-dashboard-kpi">
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  );
}

function PanelMessage({ text }) {
  return <p className="muted admin-dashboard-panel-message">{text}</p>;
}

function formatStatusLabel(status) {
  return String(status || '').replaceAll('_', ' ');
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [statusCounts, setStatusCounts] = useState([]);
  const [dailySeries, setDailySeries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [sectionErrors, setSectionErrors] = useState({});

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      setSectionErrors({});

      const nextErrors = {};

      const overviewResult = await adminService.getStats()
        .then((data) => ({ ok: true, data }))
        .catch(() => ({ ok: false }));

      if (!active) return;

      if (!overviewResult.ok) {
        setError('Không thể tải thống kê bảng điều khiển.');
        setLoading(false);
        return;
      }

      const overview = overviewResult.data;
      setStats(overview);

      const [ordersResult, statusResults] = await Promise.all([
        adminService.getOrders({ page: 0, size: 100, sort: 'createdAt,desc' })
          .then((response) => ({ ok: true, ...extractPagedItems(response) }))
          .catch(() => ({ ok: false, items: [] })),
        Promise.all(
          getOrderStatuses().map((status) =>
            adminService.getOrders({ page: 0, size: 1, status, sort: 'createdAt,desc' })
              .then((response) => {
                const page = extractPagedItems(response);
                return { status, count: page.totalItems };
              })
              .catch(() => ({ status, count: null })),
          ),
        ),
      ]);

      if (!active) return;

      if (ordersResult.ok) {
        setDailySeries(buildDailySeries(ordersResult.items, CHART_DAYS));
      } else {
        nextErrors.orders = 'Không thể tải dữ liệu biểu đồ.';
        setDailySeries(buildDailySeries([], CHART_DAYS));
      }

      const hasStatusFailure = statusResults.some((item) => item.count === null);
      if (hasStatusFailure) {
        nextErrors.status = 'Không thể tải một số tổng trạng thái đơn hàng.';
      }
      setStatusCounts(
        statusResults.map((item) => ({
          status: item.status,
          count: item.count ?? 0,
          label: formatStatusLabel(item.status),
        })),
      );

      setSectionErrors(nextErrors);
      setLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const statusTotal = useMemo(
    () => statusCounts.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [statusCounts],
  );

  const topBooks = stats?.topSellingBooks || [];
  const booksSoldTotal = sumBooksSold(topBooks);

  if (loading) return <LoadingState text="Đang tải bảng điều khiển..." />;
  if (error) {
    return (
      <ErrorState text={error}>
        <Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>
      </ErrorState>
    );
  }

  return (
    <section className="stack admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>Bảng điều khiển quản trị</h1>
        <Button
          type="button"
          className="btn-secondary"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Làm mới
        </Button>
      </div>

      <div className="admin-dashboard-kpis">
        <KpiCard
          label="Doanh thu"
          value={formatCurrency(stats?.recognizedRevenue || 0)}
        />
        <KpiCard
          label="Đơn hàng"
          value={stats?.totalOrders ?? 0}
        />
        <KpiCard
          label="Tài khoản hệ thống"
          value={stats?.totalUsers ?? 0}
        />
        <KpiCard
          label="Sách đã bán"
          value={booksSoldTotal}
        />
        <KpiCard
          label="Sách"
          value={stats?.totalBooks ?? 0}
        />
      </div>

      <div className="admin-dashboard-charts">
        <div className="panel admin-dashboard-chart-panel">
          <div className="panel-heading compact">
            <h3>Doanh thu ({CHART_DAYS} ngày gần nhất)</h3>
          </div>
          {sectionErrors.orders ? (
            <PanelMessage text={sectionErrors.orders} />
          ) : (
            <div className="admin-dashboard-chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={72} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    name="Doanh thu"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel admin-dashboard-chart-panel">
          <div className="panel-heading compact">
            <h3>Đơn hàng ({CHART_DAYS} ngày gần nhất)</h3>
          </div>
          {sectionErrors.orders ? (
            <PanelMessage text={sectionErrors.orders} />
          ) : (
            <div className="admin-dashboard-chart">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={40} />
                  <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
                  <Bar dataKey="orderCount" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Đơn hàng" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <div className="panel">
          <div className="panel-heading compact">
            <h3>Trạng thái đơn hàng</h3>
            <Link to="/admin/orders">Xem tất cả</Link>
          </div>
          {sectionErrors.status ? <PanelMessage text={sectionErrors.status} /> : null}
          <ul className="admin-dashboard-status-list">
            {statusCounts.map((item) => {
              const percent = statusTotal > 0 ? Math.round((item.count / statusTotal) * 100) : 0;
              return (
                <li key={item.status}>
                  <div className="admin-dashboard-status-row">
                    <OrderStatusBadge status={item.status} />
                    <strong>{item.count}</strong>
                  </div>
                  <div className="admin-dashboard-status-bar" aria-hidden="true">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-heading compact">
            <h3>Sách bán chạy nhất</h3>
            <Link to="/admin/books">Danh mục sách</Link>
          </div>
          {topBooks.length === 0 ? (
            <PanelMessage text="Chưa có dữ liệu bán hàng." />
          ) : (
            <ul className="admin-dashboard-top-books">
              {topBooks.slice(0, 8).map((book, index) => (
                <li key={book.id || `${book.title}-${index}`}>
                  <span className="admin-dashboard-rank">{index + 1}</span>
                  <div>
                    <Link to={`/admin/books/${book.id}`}>{book.title}</Link>
                    <p className="muted">{book.author || 'Tác giả không xác định'}</p>
                  </div>
                  <strong>{book.soldCount || 0} đã bán</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
