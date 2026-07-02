import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import OrderTimeline from '../../components/orders/OrderTimeline';
import Table from '../../components/ui/Table';
import { LoadingState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderService.getOrderById(id)
      .then(setOrder)
      .catch(err => console.error('Failed to load order detail:', err));
  }, [id]);

  if (!order) return <LoadingState text="Loading order detail..." />;

  const address = typeof order.addressSnapshot === 'string'
    ? JSON.parse(order.addressSnapshot)
    : order.addressSnapshot || {};

  return (
    <section className="stack">
      <h1>Order #{order.id}</h1>
      <OrderStatusBadge status={order.status} size="large" />

      <div className="panel">
        <h3>Shipping Address</h3>
        <p>{address.recipient} - {address.phone}</p>
        <p>{[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ')}</p>
      </div>

      <Table
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'lineTotal', label: 'Line Total', render: (row) => formatCurrency(row.lineTotal) },
        ]}
        rows={order.items}
      />

      <h2>Total: {formatCurrency(order.total)}</h2>

      <OrderTimeline history={order.statusHistory || []} />
    </section>
  );
}
