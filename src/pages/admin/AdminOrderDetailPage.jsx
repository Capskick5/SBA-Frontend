import { useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { adminService } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { useEffect } from 'react';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [showShipModal, setShowShipModal] = useState(false);
  const [shippingProvider, setShippingProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('TRK' + Date.now());
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    orderService.getOrderById(id)
      .then(setOrder)
      .catch(err => console.error('Failed to load order detail:', err));
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === 'SHIPPED') {
      setTrackingCode('TRK' + Date.now());
      setShowShipModal(true);
      return;
    }
    
    await submitStatus(newStatus);
  };

  const submitStatus = async (status, provider, tracking) => {
    setUpdating(true);
    try {
      await adminService.updateOrderStatus(id, status, provider, tracking);
      window.location.reload();
    } catch (err) {
      alert('Failed to update order: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleShipSubmit = (e) => {
    e.preventDefault();
    if (!shippingProvider || !trackingCode) return;
    submitStatus('SHIPPED', shippingProvider, trackingCode);
  };

  return (
    <>
      <div className="admin-actions">
        <h3>Status Management</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {['PENDING', 'PENDING_PAYMENT', 'PAID'].includes(order?.status) && (
            <Button onClick={() => handleUpdateStatus('PROCESSING')} disabled={updating}>Process</Button>
          )}
          {order?.status === 'PROCESSING' && (
            <Button onClick={() => handleUpdateStatus('SHIPPED')} disabled={updating}>Ship</Button>
          )}
          {order?.status === 'SHIPPED' && (
            <Button onClick={() => handleUpdateStatus('DELIVERED')} disabled={updating}>Deliver</Button>
          )}
          {order && !['DELIVERED', 'CANCELLED'].includes(order.status) && (
            <Button onClick={() => handleUpdateStatus('CANCELLED')} disabled={updating}>Cancel Order</Button>
          )}
        </div>
      </div>

      {showShipModal && (
        <Modal title="Shipping Details" onClose={() => setShowShipModal(false)} hideClose={true}>
          <form onSubmit={handleShipSubmit} style={{ padding: '16px' }}>
            <Input
              label="Shipping Provider"
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
              required
            />
            <Input
              label="Tracking Code"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <Button type="button" onClick={() => setShowShipModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={updating}>Confirm Ship</Button>
            </div>
          </form>
        </Modal>
      )}

      <OrderDetailPage />
    </>
  );
}
