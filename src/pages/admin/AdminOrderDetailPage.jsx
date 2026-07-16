import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import OrderDetailPage from '../orders/OrderDetailPage';
import OrderStatusBadge from '../../components/orders/OrderStatusBadge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { adminService } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { ShoppingCart, Warehouse, Truck, CircleDollarSign, User } from 'lucide-react';

const steps = [
  { label: 'Placed', icon: ShoppingCart },
  { label: 'Paid', icon: CircleDollarSign },
  { label: 'Packed', icon: Warehouse },
  { label: 'Shipped', icon: Truck },
  { label: 'Delivered', icon: User }
];

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

  const status = order?.status;
  const isCancelled = status === 'CANCELLED';

  const stepsActive = [
    status !== 'CANCELLED', // Step 1: Placed
    ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status), // Step 2: Paid
    ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status), // Step 3: Packed
    ['SHIPPED', 'DELIVERED'].includes(status), // Step 4: Shipped
    status === 'DELIVERED' // Step 5: Delivered
  ];

  const getNextStepIndex = () => {
    if (status === 'PAID') return 2; // Index 2 is "Packed" (Step 3)
    if (status === 'PROCESSING') return 3; // Index 3 is "Shipped" (Step 4)
    if (status === 'SHIPPED') return 4; // Index 4 is "Delivered" (Step 5)
    return -1;
  };

  const nextStepIndex = getNextStepIndex();

  const handleStepClick = (index) => {
    if (index !== nextStepIndex || updating) return;
    if (index === 2) handleUpdateStatus('PROCESSING');
    if (index === 3) handleUpdateStatus('SHIPPED');
    if (index === 4) handleUpdateStatus('DELIVERED');
  };

  const getStepTooltip = (index, label) => {
    if (index !== nextStepIndex) return undefined;
    if (index === 2) return `Click to start packaging (${label})`;
    if (index === 3) return `Click to enter shipping info (${label})`;
    if (index === 4) return `Click to complete order (${label})`;
    return undefined;
  };

  return (
    <>
      {order && (
        <div className={`admin-order-flow-container ${isCancelled ? 'cancelled' : ''}`}>
          <div className="admin-actions-heading" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Order Fulfilment</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                Track progress and perform action updates.
              </p>
            </div>
            {order?.status && <OrderStatusBadge status={order.status} />}
          </div>
          
          <div className="admin-order-flow-steps" style={{ margin: '16px 0 20px 0' }}>
            <div className="admin-order-flow-lines">
              <div className={`admin-order-flow-line-segment ${stepsActive[0] && stepsActive[1] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[1] && stepsActive[2] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[2] && stepsActive[3] ? 'active' : ''}`} />
              <div className={`admin-order-flow-line-segment ${stepsActive[3] && stepsActive[4] ? 'active' : ''}`} />
            </div>

            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = stepsActive[index];
              const isClickable = index === nextStepIndex && !updating;
              return (
                <div 
                  key={index} 
                  className={`admin-order-flow-step ${isActive ? 'active' : ''} ${isClickable ? 'clickable' : ''}`}
                  onClick={() => handleStepClick(index)}
                  title={getStepTooltip(index, step.label)}
                >
                  <div className="admin-order-flow-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <div className="admin-order-flow-dot" />
                  <span className="admin-order-flow-label">{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="admin-order-next-action" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '4px' }}>
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
          {updateError && <p className="admin-action-error" role="alert" style={{ color: 'var(--error)', marginTop: '8px', width: '100%', textAlign: 'center' }}>{updateError}</p>}
        </div>
      )}

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
