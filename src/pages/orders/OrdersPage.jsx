import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    orderService.getOrders()
      .then(setOrders)
      .catch(err => console.error("Lỗi lấy danh sách đơn hàng:", err));
  }, []);

  return (
    <section className="stack">
      <h1>Đơn hàng của tôi</h1>
      <Table
        columns={[
          { key: 'id', label: 'Mã đơn' },
          { key: 'status', label: 'Trạng thái', render: (row) => <OrderStatusBadge status={row.status} /> },
          { key: 'total', label: 'Tổng tiền', render: (row) => formatCurrency(row.total) },
          { key: 'action', label: 'Thao tác', render: (row) => <Link to={`/orders/${row.id}`}>Xem</Link> },
        ]}
        rows={orders}
      />
    </section>
  );
}
