import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    adminService.getOrders().then((data) => {
      setOrders(data.items || data.content || (Array.isArray(data) ? data : []));
    });
  }, []);

  return (
    <section className="stack">
      <h1>Quản lý Đơn hàng</h1>
      <Table
        columns={[
          { key: 'id', label: 'Mã đơn' },
          { key: 'status', label: 'Trạng thái', render: (row) => <OrderStatusBadge status={row.status} /> },
          { key: 'total', label: 'Tổng tiền', render: (row) => formatCurrency(row.total) },
          { key: 'action', label: 'Hành động', render: (row) => <Link to={`/admin/orders/${row.id}`}>Chi tiết</Link> },
        ]}
        rows={orders}
      />
    </section>
  );
}