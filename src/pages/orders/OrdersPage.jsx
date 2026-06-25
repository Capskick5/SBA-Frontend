import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Table from '../../components/ui/Table';
import { orderService } from '../../services/orderService';
import { formatCurrency } from '../../utils/formatters';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { orderService.getOrders().then(setOrders); }, []);

  return (
    <section className="stack">
      <h1>My Orders</h1>
      <Table
        columns={[
          { key: 'id', label: 'Order' },
          { key: 'status', label: 'Status', render: (row) => <OrderStatusBadge status={row.status} /> },
          { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) },
          { key: 'action', label: 'Action', render: (row) => <Link to={`/orders/${row.id}`}>View</Link> },
        ]}
        rows={orders}
      />
    </section>
  );
}
