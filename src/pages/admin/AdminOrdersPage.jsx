import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { adminService.getOrders().then(setOrders); }, []);
  return (
    <section className="stack">
      <h1>Manage Orders</h1>
      <Table
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status', render: (row) => <OrderStatusBadge status={row.status} /> },
          { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) },
          { key: 'action', label: 'Action', render: (row) => <Link to={`/admin/orders/${row.id}`}>View</Link> },
        ]}
        rows={orders}
      />
    </section>
  );
}
