import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';

export default function AdminOrderDetailPage() {
  const { id } = useParams();

  const handleUpdateStatus = async (newStatus) => {
    try {
      await adminService.updateOrderStatus(id, newStatus);
      window.location.reload(); // Refresh trang để cập nhật giao diện
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    }
  };

  return (
    <>
      <div className="admin-actions">
        <h3>Quản trị trạng thái</h3>
        <Button onClick={() => handleUpdateStatus('PROCESSING')}>Xử lý</Button>
        <Button onClick={() => handleUpdateStatus('SHIPPED')}>Đã giao</Button>
        <Button onClick={() => handleUpdateStatus('CANCELLED')}>Huỷ</Button>
      </div>
      <OrderDetailPage />
    </>
  );
}