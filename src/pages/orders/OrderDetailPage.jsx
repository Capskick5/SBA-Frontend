import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import OrderTimeline from '../../components/orders/OrderTimeline';
import Table from '../../components/ui/Table';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { orderService.getOrderById(id).then(setOrder); }, [id]);
  if (!order) return <p>Order not found.</p>;

  return (
    <section className="stack">
      <h1>Order #{order.id}</h1>
      <OrderStatusBadge status={order.status} />
      <div className="panel">
        <h3>Address Snapshot</h3>
        <p>{order.addressSnapshot.recipient} - {order.addressSnapshot.line}, {order.addressSnapshot.city}</p>
      </div>
      <Table
        columns={[
          { key: 'titleSnapshot', label: 'Book' },
          { key: 'quantity', label: 'Qty' },
          { key: 'lineTotal', label: 'Total', render: (row) => formatCurrency(row.lineTotal) },
        ]}
        rows={order.items}
      />
      <h2>Total: {formatCurrency(order.total)}</h2>
      <OrderTimeline history={order.statusHistory} />
    </section>
  );
}
