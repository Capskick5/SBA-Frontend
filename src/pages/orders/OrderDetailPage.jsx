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

  useEffect(() => {
    orderService.getOrderById(id)
      .then(setOrder)
      .catch(err => console.error("Lỗi tải chi tiết đơn hàng:", err));
  }, [id]);

  if (!order) return <p>Đang tải chi tiết đơn hàng...</p>;

  // Chuyển đổi addressSnapshot từ chuỗi JSON sang object nếu backend trả về là string
  const address = typeof order.addressSnapshot === 'string'
    ? JSON.parse(order.addressSnapshot)
    : order.addressSnapshot || {};

  return (
    <section className="stack">
      <h1>Đơn hàng #{order.id}</h1>
      <OrderStatusBadge status={order.status} />

      <div className="panel">
        <h3>Địa chỉ giao hàng</h3>
        <p>{address.recipient} - {address.phone}</p>
        <p>{[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ')}</p>
      </div>

      <Table
        columns={[
          { key: 'title', label: 'Tên sách' },
          { key: 'quantity', label: 'SL' },
          { key: 'lineTotal', label: 'Thành tiền', render: (row) => formatCurrency(row.lineTotal) },
        ]}
        rows={order.items}
      />

      <h2>Tổng cộng: {formatCurrency(order.total)}</h2>

      <OrderTimeline history={order.statusHistory || []} />
    </section>
  );
}
