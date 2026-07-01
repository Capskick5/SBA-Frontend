import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';

export default function AdminOrderDetailPage() {
  const { id } = useParams();

  const handleUpdateStatus = async (newStatus) => {
    try {
      let shippingProvider = undefined;
      let trackingCode = undefined;

      if (newStatus === 'SHIPPED') {
        shippingProvider = prompt('Enter Shipping Provider:', 'GHTK');
        if (!shippingProvider) return;
        trackingCode = prompt('Enter Tracking Code:', 'TRK' + Date.now());
        if (!trackingCode) return;
      }

      await adminService.updateOrderStatus(id, newStatus, shippingProvider, trackingCode);
      window.location.reload();
    } catch (err) {
      alert('Failed to update order: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <>
      <div className="admin-actions">
        <h3>Status Management</h3>
        <Button onClick={() => handleUpdateStatus('PROCESSING')}>Process</Button>
        <Button onClick={() => handleUpdateStatus('SHIPPED')}>Ship</Button>
        <Button onClick={() => handleUpdateStatus('DELIVERED')}>Deliver</Button>
        <Button onClick={() => handleUpdateStatus('CANCELLED')}>Cancel Order</Button>
      </div>
      <OrderDetailPage />
    </>
  );
}
