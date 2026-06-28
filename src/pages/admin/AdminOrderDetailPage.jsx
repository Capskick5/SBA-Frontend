import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';

export default function AdminOrderDetailPage() {
  const { id } = useParams();

  const handleUpdateStatus = async (newStatus) => {
    try {
      await adminService.updateOrderStatus(id, newStatus);
      window.location.reload();
    } catch (err) {
      alert('Failed to update order: ' + err.message);
    }
  };

  return (
    <>
      <div className="admin-actions">
        <h3>Status Management</h3>
        <Button onClick={() => handleUpdateStatus('PROCESSING')}>Process</Button>
        <Button onClick={() => handleUpdateStatus('SHIPPED')}>Ship</Button>
        <Button onClick={() => handleUpdateStatus('CANCELLED')}>Cancel</Button>
      </div>
      <OrderDetailPage />
    </>
  );
}
