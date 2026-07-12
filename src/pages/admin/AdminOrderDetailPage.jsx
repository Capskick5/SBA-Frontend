import { useState } from 'react';
import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
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
  const [trackingCode, setTrackingCode] = useState('');
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState(null);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    orderService.getOrderById(id)
      .then(setOrder)
      .catch(err => console.error('Failed to load order detail:', err));
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (newStatus === 'SHIPPED') {
      setTrackingCode(`TRK-${id}`);
      setShowShipModal(true);
      return;
    }
    
    await submitStatus(newStatus);
  };

  const submitStatus = async (status, provider, tracking) => {
    setUpdating(true);
    setUpdateError('');
    try {
      await adminService.updateOrderStatus(id, status, provider, tracking);
      window.location.reload();
    } catch (err) {
      setUpdateError(err.response?.data?.message || err.message || 'Could not update the order.');
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
        <div className="admin-actions-heading">
          <div>
            <h3>Status Management</h3>
            <p>Complete the next step in this order's fulfilment.</p>
          </div>
          {order?.status && <OrderStatusBadge status={order.status} />}
        </div>
        <div className="admin-order-next-action">
          {order?.status === 'PAID' && (
            <Button onClick={() => handleUpdateStatus('PROCESSING')} loading={updating}>Start processing</Button>
          )}
          {order?.status === 'PROCESSING' && (
            <Button onClick={() => handleUpdateStatus('SHIPPED')} loading={updating}>Mark as shipped</Button>
          )}
          {order?.status === 'SHIPPED' && (
            <Button onClick={() => handleUpdateStatus('DELIVERED')} loading={updating}>Mark as delivered</Button>
          )}
          {order && !['PAID', 'PROCESSING', 'SHIPPED'].includes(order.status) && (
            <span className="admin-order-no-action">No fulfilment action is available for this status.</span>
          )}
        </div>
        {updateError && <p className="admin-action-error" role="alert">{updateError}</p>}
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
              <Button type="button" className="btn-secondary" onClick={() => setShowShipModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={updating}>Confirm Ship</Button>
            </div>
          </form>
        </Modal>
      )}

      <OrderDetailPage adminView />
    </>
  );
}
