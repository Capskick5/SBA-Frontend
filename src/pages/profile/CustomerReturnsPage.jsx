import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { ErrorState, LoadingState, EmptyState } from '../../components/ui/State';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import { refundService } from '../../services/refundService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  PackageCheck,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';

const REASON_LABELS = {
  BOOK_DEFECT: 'Sách bị lỗi',
  WRONG_BOOK: 'Giao sai sách',
  DAMAGED_IN_TRANSIT: 'Sách bị hư hỏng do vận chuyển',
};

const STATUS_TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'UNDER_REVIEW', label: 'Đang xem xét', statuses: ['UNDER_REVIEW'] },
  { id: 'PICKUP_PENDING', label: 'Chờ gửi hàng', statuses: ['PICKUP_PENDING'] },
  { id: 'INSPECTING', label: 'Đang xử lý', statuses: ['RETURN_RECEIVED', 'INSPECTING', 'REFUND_PROCESSING'] },
  { id: 'COMPLETED', label: 'Đã hoàn tiền', statuses: ['REFUND_COMPLETED', 'COMPLETED'] },
  { id: 'REJECTED', label: 'Đã từ chối', statuses: ['REJECTED'] },
];

const STATUS_META = {
  UNDER_REVIEW: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG XEM XÉT' },
  REJECTED: { badgeClass: 'cancelled', badgeLabel: 'ĐÃ TỪ CHỐI' },
  PICKUP_PENDING: { badgeClass: 'refund-requested', badgeLabel: 'CHỜ GỬI HÀNG' },
  RETURN_RECEIVED: { badgeClass: 'refund-requested', badgeLabel: 'ĐÃ NHẬN HÀNG' },
  INSPECTING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG KIỂM TRA' },
  REFUND_PROCESSING: { badgeClass: 'refund-requested', badgeLabel: 'ĐANG HOÀN TIỀN' },
  REFUND_COMPLETED: { badgeClass: 'refunded', badgeLabel: 'ĐÃ HOÀN TIỀN' },
  COMPLETED: { badgeClass: 'refunded', badgeLabel: 'HOÀN TẤT' },
};

function EvidenceThumbnail({ url }) {
  const [isVideo, setIsVideo] = useState(false);
  const style = {
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid var(--border)',
  };
  return isVideo ? (
    <video src={url} style={style} muted />
  ) : (
    <img src={url} alt="Bằng chứng" style={style} onError={() => setIsVideo(true)} />
  );
}

export default function CustomerReturnsPage() {
  const [returnsList, setReturnsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterTab, setFilterTab] = useState('ALL');

  // Detail Modal State
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Shipment Form Modal State
  const [shipModalData, setShipModalData] = useState(null);
  const [shippingProvider, setShippingProvider] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [submittingShipment, setSubmittingShipment] = useState(false);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersRes = await orderService.getOrdersPage({ page: 0, size: 100 });
      const rawOrders = ordersRes.items || [];

      const bookCache = {};
      const fetchBookCover = async (bookId) => {
        if (!bookId) return null;
        if (bookCache[bookId] !== undefined) return bookCache[bookId];
        try {
          const book = await bookService.getBookById(bookId);
          bookCache[bookId] = book?.coverUrl || null;
          return bookCache[bookId];
        } catch {
          bookCache[bookId] = null;
          return null;
        }
      };

      const returnsFound = [];
      await Promise.all(
        rawOrders.map(async (order) => {
          try {
            const ref = await refundService.getRefundByOrderId(order.id);
            if (ref) {
              const itemsWithCovers = await Promise.all(
                (ref.items || []).map(async (it) => {
                  const cover = await fetchBookCover(it.bookId);
                  return {
                    ...it,
                    coverUrl: cover || it.coverUrl || it.bookCoverUrl,
                  };
                })
              );

              returnsFound.push({
                ...ref,
                orderNumber: order.id,
                items: itemsWithCovers.length ? itemsWithCovers : ref.items,
              });
            }
          } catch {
            // No refund request for this order
          }
        })
      );

      returnsFound.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReturnsList(returnsFound);
    } catch (err) {
      console.error('Failed to load customer returns:', err);
      setError('Không thể tải danh sách đổi trả. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturns();
    const handleUpdated = () => loadReturns();
    window.addEventListener('refund_updated', handleUpdated);
    return () => window.removeEventListener('refund_updated', handleUpdated);
  }, [loadReturns]);

  const getBookCover = (item) => {
    return (
      item.coverUrl ||
      item.bookCoverUrl ||
      `https://placehold.co/120x170?text=${encodeURIComponent(item.title || 'Sách')}`
    );
  };

  const handleShipmentSubmit = async (e) => {
    e.preventDefault();
    if (!shipModalData || !shippingProvider.trim() || !trackingCode.trim()) {
      showToast('Vui lòng điền đầy đủ đơn vị vận chuyển và mã vận đơn', 'error');
      return;
    }
    setSubmittingShipment(true);
    try {
      await refundService.submitReturnShipment(
        shipModalData.orderId || shipModalData.orderNumber,
        shipModalData.id,
        {
          shippingProvider: shippingProvider.trim(),
          trackingCode: trackingCode.trim(),
        }
      );
      showToast('Đã cập nhật thông tin vận chuyển trả hàng thành công!', 'success');
      setShipModalData(null);
      setTrackingCode('');
      setSelectedReturn(null);
      loadReturns();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra', 'error');
    } finally {
      setSubmittingShipment(false);
    }
  };

  const currentTabObj = STATUS_TABS.find((t) => t.id === filterTab);
  const filteredList = returnsList.filter((item) => {
    if (!currentTabObj || !currentTabObj.statuses?.length) return true;
    return currentTabObj.statuses.includes(item.status);
  });

  return (
    <section className="stack orders-page">
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)', margin: '0' }}>
        Quản lý đổi trả / hoàn tiền
      </h1>

      <div className="orders-panel-toolbar">
        {/* Tabs list */}
        <div className="orders-tabs-wrapper">
          <ul className="orders-tabs">
            {STATUS_TABS.map((tab) => (
              <li key={tab.id} style={{ flex: 1 }}>
                <button
                  type="button"
                  className={`orders-tab ${filterTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setFilterTab(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="orders-panel-body">
        {loading ? (
          <LoadingState text="Đang tải danh sách đổi trả..." />
        ) : error ? (
          <ErrorState text={error}>
            <Button onClick={loadReturns}>Thử lại</Button>
          </ErrorState>
        ) : filteredList.length === 0 ? (
          <EmptyState
            text={
              filterTab === 'ALL'
                ? 'Bạn chưa có yêu cầu đổi trả nào.'
                : `Không có yêu cầu nào ở mục "${currentTabObj?.label}".`
            }
          >
            <Link to="/orders">
              <Button variant="primary">Xem lịch sử đơn hàng</Button>
            </Link>
          </EmptyState>
        ) : (
          <>
            <div className="orders-page-count">
              Hiển thị {filteredList.length} / {returnsList.length} yêu cầu
            </div>
            <div className="order-cards-list">
              {filteredList.map((item) => {
                const isRejected = item.status === 'REJECTED';
                return (
                  <div key={item.id} className="order-card">
                    {/* Header: Request ID, Order Date & Status */}
                    <div className="order-card-header">
                      <div className="order-card-info">
                        <span className="order-card-id">Yêu cầu trả hàng #{item.id}</span>
                        <span className="order-card-date">
                          Đơn hàng #{item.orderId || item.orderNumber} · Đặt ngày {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                      <span className={`status-badge ${STATUS_META[item.status]?.badgeClass || 'refund-requested'}`}>
                        {STATUS_META[item.status]?.badgeLabel || item.status}
                      </span>
                    </div>

                    {/* Rejected Alert Box (if applicable) */}
                    {isRejected && (
                      <div
                        style={{
                          padding: '10px 16px',
                          margin: '12px 16px 0 16px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '8px',
                          color: '#dc2626',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '13px',
                        }}
                      >
                        <AlertCircle size={16} />
                        <div>
                          <strong>Yêu cầu trả hàng đã bị từ chối</strong>
                          {item.decisionNote && (
                            <p style={{ margin: '2px 0 0 0', fontStyle: 'italic' }}>Lý do: {item.decisionNote}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Body: Product List */}
                    <div className="order-card-body">
                      {item.items?.map((it, idx) => (
                        <div key={`${item.id}-item-${idx}`} className="order-item-row">
                          <div className="order-item-cover-wrapper">
                            <img
                              src={getBookCover(it)}
                              alt={it.title || 'Bìa sách'}
                              className="order-item-cover"
                              onError={(e) => {
                                e.target.src = `https://placehold.co/120x170?text=${encodeURIComponent(it.title || 'Sách')}`;
                              }}
                            />
                          </div>
                          <div className="order-item-details">
                            <h4 className="order-item-title">{it.title}</h4>
                            <span className="order-item-qty">Số lượng: x{it.quantity}</span>
                          </div>
                          <div className="order-item-price">
                            {formatCurrency(it.lineTotal || 0)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer: Summary & Actions */}
                    <div className="order-card-footer">
                      <div className="order-card-shipping">
                        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                          Lý do trả: <strong style={{ color: 'var(--text)' }}>{REASON_LABELS[item.reason] || item.reason}</strong>
                        </span>
                      </div>
                      <div className="order-card-summary">
                        <div className="order-card-total-row">
                          <span>Hoàn tiền:</span>
                          <span className="order-card-total-price">
                            {formatCurrency(item.requestedAmount || 0)}
                          </span>
                        </div>
                        <div className="order-card-actions">
                          {item.status === 'PICKUP_PENDING' && !item.returnTrackingCode && (
                            <Button
                              className="btn-success-solid"
                              size="sm"
                              onClick={() => {
                                setShipModalData(item);
                                setShippingProvider('GHTK');
                                setTrackingCode('');
                              }}
                            >
                              <Truck size={14} style={{ marginRight: '4px' }} /> Nhập mã vận đơn
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedReturn(item)}
                          >
                            <Eye size={14} style={{ marginRight: '4px' }} /> Xem chi tiết
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail View Modal */}
      {selectedReturn && (
        <Modal isOpen={!!selectedReturn} onClose={() => setSelectedReturn(null)} title="" maxWidth="720px">
          <div className="admin-refund-modal-container">
            {/* Header */}
            <div className="admin-refund-modal-header">
              <div className="admin-refund-header-title-box">
                <div className="admin-refund-title-row">
                  <h2>Chi tiết yêu cầu trả hàng #{selectedReturn.id}</h2>
                  <span className={`status-badge ${STATUS_META[selectedReturn.status]?.badgeClass || 'refund-requested'}`}>
                    {STATUS_META[selectedReturn.status]?.badgeLabel || selectedReturn.status}
                  </span>
                </div>
                <span className="admin-refund-order-badge">
                  Đơn hàng #{selectedReturn.orderId || selectedReturn.orderNumber} • Tạo lúc {formatDateTime(selectedReturn.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="admin-refund-modal-close-btn"
                onClick={() => setSelectedReturn(null)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="admin-refund-modal-body">
              {/* Hero summary */}
              <div className="admin-refund-hero-card">
                <div className="admin-refund-hero-item">
                  <span className="admin-refund-hero-label">Lý do trả hàng</span>
                  <strong className="admin-refund-hero-reason">
                    {REASON_LABELS[selectedReturn.reason] || selectedReturn.reason}
                  </strong>
                </div>
                <div className="admin-refund-hero-divider" />
                <div className="admin-refund-hero-item">
                  <span className="admin-refund-hero-label">Số tiền hoàn</span>
                  <strong className="admin-refund-hero-amount">
                    {formatCurrency(selectedReturn.requestedAmount)}
                  </strong>
                </div>
              </div>

              {/* Refunded Items List */}
              {selectedReturn.items?.length > 0 && (
                <div className="admin-refund-section">
                  <h4 className="admin-refund-section-title">
                    <PackageCheck size={16} /> Sản phẩm yêu cầu trả ({selectedReturn.items.length})
                  </h4>
                  <div className="admin-refund-items-list">
                    {selectedReturn.items.map((it) => (
                      <div key={it.orderItemId} className="admin-refund-item-card">
                        <div className="admin-refund-item-info">
                          <span className="admin-refund-item-title">{it.title}</span>
                          <span className="admin-refund-item-qty">
                            Số lượng: <strong>x{it.quantity}</strong>
                          </span>
                        </div>
                        <strong className="admin-refund-item-price">{formatCurrency(it.lineTotal)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="admin-refund-section">
                <h4 className="admin-refund-section-title">
                  <FileText size={16} /> Mô tả từ bạn
                </h4>
                <div className="admin-refund-desc-box">
                  <p>{selectedReturn.description || 'Bạn không nhập thêm mô tả.'}</p>
                </div>
              </div>

              {/* Evidence Media */}
              {selectedReturn.evidence?.length > 0 && (
                <div className="admin-refund-section">
                  <h4 className="admin-refund-section-title">
                    <Camera size={16} /> Bằng chứng đính kèm ({selectedReturn.evidence.length})
                  </h4>
                  <div className="admin-refund-evidence-grid">
                    {selectedReturn.evidence.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-refund-evidence-item"
                        title="Xem tệp gốc"
                      >
                        <EvidenceThumbnail url={ev.url} />
                        <span className="admin-refund-evidence-hover-overlay">
                          <ExternalLink size={13} /> Mở tệp
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Account Info */}
              <div className="admin-refund-section">
                <h4 className="admin-refund-section-title">
                  <Building2 size={16} /> Tài khoản nhận tiền hoàn
                </h4>
                <div className="admin-refund-bank-card">
                  <div className="admin-refund-bank-row">
                    <span className="admin-refund-bank-label">Ngân hàng</span>
                    <strong className="admin-refund-bank-val">{selectedReturn.bankName || 'Chưa cung cấp'}</strong>
                  </div>
                  <div className="admin-refund-bank-row">
                    <span className="admin-refund-bank-label">Số tài khoản</span>
                    <strong className="admin-refund-bank-val is-acc-num">
                      {selectedReturn.bankAccountNumber || 'Chưa cung cấp'}
                    </strong>
                  </div>
                  <div className="admin-refund-bank-row">
                    <span className="admin-refund-bank-label">Chủ tài khoản</span>
                    <strong className="admin-refund-bank-val is-owner">
                      {selectedReturn.bankAccountHolder || 'Chưa cung cấp'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Process History / Audit */}
              {(selectedReturn.decidedAt || selectedReturn.returnTrackingCode || selectedReturn.refundProcessedAt) && (
                <div className="admin-refund-section">
                  <h4 className="admin-refund-section-title">
                    <Clock size={16} /> Lịch sử xử lý
                  </h4>
                  <div className="admin-refund-audit-list">
                    {selectedReturn.decidedAt && (
                      <div className="admin-refund-audit-item">
                        <div className="admin-refund-audit-icon">
                          <ShieldCheck size={16} />
                        </div>
                        <div className="admin-refund-audit-content">
                          <strong>Duyệt yêu cầu</strong>
                          <span>Xử lý lúc {formatDateTime(selectedReturn.decidedAt)}</span>
                          {selectedReturn.decisionNote && (
                            <p className="admin-refund-audit-note">Ghi chú từ BookVerse: {selectedReturn.decisionNote}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedReturn.returnTrackingCode && (
                      <div className="admin-refund-audit-item">
                        <div className="admin-refund-audit-icon">
                          <Truck size={16} />
                        </div>
                        <div className="admin-refund-audit-content">
                          <strong>Vận chuyển gửi trả hàng</strong>
                          <span>
                            Đơn vị: <b>{selectedReturn.returnShippingProvider}</b> • Mã vận đơn: <b>{selectedReturn.returnTrackingCode}</b>
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedReturn.refundProcessedAt && (
                      <div className="admin-refund-audit-item">
                        <div className="admin-refund-audit-icon">
                          <CheckCircle size={16} />
                        </div>
                        <div className="admin-refund-audit-content">
                          <strong>Hoàn tiền thành công</strong>
                          <span>BookVerse đã chuyển khoản lúc {formatDateTime(selectedReturn.refundProcessedAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="admin-refund-modal-footer">
              {selectedReturn.status === 'PICKUP_PENDING' && !selectedReturn.returnTrackingCode && (
                <Button
                  className="btn-success-solid"
                  onClick={() => {
                    setShipModalData(selectedReturn);
                    setShippingProvider('GHTK');
                    setTrackingCode('');
                  }}
                >
                  <Truck size={16} style={{ marginRight: '4px' }} /> Nhập mã vận đơn gửi trả
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedReturn(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Shipment Input Modal */}
      {shipModalData && (
        <Modal
          title={`Gửi trả hàng cho Yêu cầu #${shipModalData.id}`}
          onClose={() => setShipModalData(null)}
          maxWidth="480px"
        >
          <form onSubmit={handleShipmentSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--muted)' }}>
              Vui lòng mang hàng ra bưu cục gửi về địa chỉ kho BookVerse và nhập thông tin vận chuyển bên dưới.
            </p>
            <Input
              label="Đơn vị vận chuyển"
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
              placeholder="VD: GHTK, GHN, Viettel Post..."
              required
            />
            <Input
              label="Mã vận đơn"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Nhập mã vận đơn bưu cục cung cấp"
              required
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button type="button" variant="secondary" onClick={() => setShipModalData(null)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" loading={submittingShipment}>
                Xác nhận đã gửi hàng
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
