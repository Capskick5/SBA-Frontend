import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import OrderTimeline from '../../components/orders/OrderTimeline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [nextStatus, setNextStatus] = useState('PROCESSING');
  const [shippingProvider, setShippingProvider] = useState('');
  const [trackingCode, setTrackingCode] = useState('');

  useEffect(() => { adminService.getOrderById(id).then(setOrder); }, [id]);
  if (!order) return <p>Order not found.</p>;

  const updateStatus = async () => {
    const updated = await adminService.updateOrderStatus(order.id, nextStatus, { shippingProvider, trackingCode });
    setOrder({
      ...updated,
      statusHistory: [
        ...order.statusHistory,
        { id: Date.now(), toStatus: nextStatus, note: 'Admin mock status update' },
      ],
    });
  };

  return (
    <section className="stack">
      <h1>Admin Order #{order.id}</h1>
      <OrderStatusBadge status={order.status} />
      <Table
        columns={[
          { key: 'titleSnapshot', label: 'Book' },
          { key: 'quantity', label: 'Qty' },
          { key: 'lineTotal', label: 'Total', render: (row) => formatCurrency(row.lineTotal) },
        ]}
        rows={order.items}
      />
      <div className="panel stack">
        <h2>Update Order Status</h2>
        <Select label="Next status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
          <option value="PAID">PAID</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="SHIPPED">SHIPPED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </Select>
        {nextStatus === 'SHIPPED' && (
          <>
            <Input
              label="Shipping provider"
              value={shippingProvider}
              onChange={(event) => setShippingProvider(event.target.value)}
            />
            <Input label="Tracking code" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} />
          </>
        )}
        <Button onClick={updateStatus}>Update status mock</Button>
      </div>
      <OrderTimeline history={order.statusHistory} />
    </section>
  );
}
