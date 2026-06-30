import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    setError(null);
    orderService.getOrders()
      .then((res) => {
        const data = res.data || res;
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (data && Array.isArray(data.items)) {
          setOrders(data.items);
        } else {
          setOrders([]);
        }
      })
      .catch(err => {
        console.error('Failed to load orders:', err);
        setError('Failed to load your orders. Please try again later.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <section className="stack">
      <h1>My Orders</h1>
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          <p>Loading your orders...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#e53e3e', background: '#fff5f5', borderRadius: '8px' }}>
          <p>{error}</p>
          <Button onClick={loadOrders} style={{ marginTop: '16px' }}>Retry</Button>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#374151', fontWeight: 'bold' }}>No orders yet</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>You haven't placed any orders.</p>
          <Link to="/catalog"><Button>Start Shopping</Button></Link>
        </div>
      ) : (
        <Table
          columns={[
            { key: 'id', label: 'Order ID' },
            { key: 'status', label: 'Status', render: (row) => <OrderStatusBadge status={row.status} /> },
            { key: 'total', label: 'Total', render: (row) => <strong style={{ color: '#e53e3e' }}>{formatCurrency(row.total)}</strong> },
            { key: 'action', label: 'Actions', render: (row) => <Link to={`/orders/${row.id}`} className="btn-link">View</Link> },
          ]}
          rows={orders}
        />
      )}
    </section>
  );
}
