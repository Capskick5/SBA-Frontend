export default function OrderStatusBadge({ status, size = 'small' }) {
  const getStatusColor = (s) => {
    switch (s) {
      case 'PENDING_PAYMENT': return { bg: '#fff3cd', color: '#856404', border: '#ffeeba' };
      case 'PAID': return { bg: '#d4edda', color: '#155724', border: '#c3e6cb' };
      case 'PROCESSING': return { bg: '#cce5ff', color: '#004085', border: '#b8daff' };
      case 'SHIPPED': return { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' };
      case 'DELIVERED': return { bg: '#d4edda', color: '#155724', border: '#c3e6cb' };
      case 'CANCELLED': return { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' };
      default: return { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <div style={{
      backgroundColor: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      padding: size === 'large' ? '16px 24px' : '4px 12px',
      borderRadius: size === 'large' ? '8px' : '4px',
      fontSize: size === 'large' ? '1.25rem' : '0.8rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: size === 'large' ? '1px' : '0.5px',
      display: 'inline-block',
      margin: size === 'large' ? '16px 0' : '0',
      boxShadow: size === 'large' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
    }}>
      {status ? status.replace('_', ' ') : 'UNKNOWN'}
    </div>
  );
}
