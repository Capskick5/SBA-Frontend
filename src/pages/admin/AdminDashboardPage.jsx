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
        setError('Could not load dashboard statistics.');
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
        nextErrors.orders = 'Could not load chart data.';
        setDailySeries(buildDailySeries([], CHART_DAYS));
      }

      const hasStatusFailure = statusResults.some((item) => item.count === null);
      if (hasStatusFailure) {
        nextErrors.status = 'Some order status totals could not be loaded.';
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

  if (loading) return <LoadingState text="Loading dashboard..." />;
  if (error) {
    return (
      <ErrorState text={error}>
        <Button onClick={() => setReloadKey((value) => value + 1)}>Try again</Button>
      </ErrorState>
    );
  }

  return (
    <section className="stack admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>Admin Dashboard</h1>
        <Button
          type="button"
          className="btn-secondary"
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Refresh
        </Button>
      </div>

      <div className="admin-dashboard-kpis">
        <KpiCard
          label="Revenue"
          value={formatCurrency(stats?.recognizedRevenue || 0)}
        />
        <KpiCard
          label="Orders"
          value={stats?.totalOrders ?? 0}
        />
        <KpiCard
          label="System accounts"
          value={stats?.totalUsers ?? 0}
        />
        <KpiCard
          label="Books sold"
          value={booksSoldTotal}
        />
        <KpiCard
          label="Books"
          value={stats?.totalBooks ?? 0}
        />
      </div>

      <div className="admin-dashboard-charts">
        <div className="panel admin-dashboard-chart-panel">
          <div className="panel-heading compact">
            <h3>Revenue (last {CHART_DAYS} days)</h3>
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
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="panel admin-dashboard-chart-panel">
          <div className="panel-heading compact">
            <h3>Orders (last {CHART_DAYS} days)</h3>
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
                  <Bar dataKey="orderCount" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <div className="panel">
          <div className="panel-heading compact">
            <h3>Order status</h3>
            <Link to="/admin/orders">View all</Link>
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
            <h3>Top selling books</h3>
            <Link to="/admin/books">Catalog</Link>
          </div>
          {topBooks.length === 0 ? (
            <PanelMessage text="No sales data yet." />
          ) : (
            <ul className="admin-dashboard-top-books">
              {topBooks.slice(0, 8).map((book, index) => (
                <li key={book.id || `${book.title}-${index}`}>
                  <span className="admin-dashboard-rank">{index + 1}</span>
                  <div>
                    <Link to={`/admin/books/${book.id}`}>{book.title}</Link>
                    <p className="muted">{book.author || 'Unknown author'}</p>
                  </div>
                  <strong>{book.soldCount || 0} sold</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
