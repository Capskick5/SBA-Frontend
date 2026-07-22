import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReviewForm from '../../components/reviews/ReviewForm';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/State';
import { bookService } from '../../services/bookService';
import { orderService } from '../../services/orderService';
import { reviewService } from '../../services/reviewService';
import { formatDate } from '../../utils/formatters';
import { showToast } from '../../utils/toast';

const TABS = [
  { id: 'pending', label: 'Chờ đánh giá' },
  { id: 'reviewed', label: 'Đã đánh giá' },
];

function coverFallback(title) {
  return `https://placehold.co/80x110?text=${encodeURIComponent(title || 'Sách')}`;
}

export default function MyReviewsPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [reviewed, setReviewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [writingBookId, setWritingBookId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const ordersPage = await orderService.getOrdersPage({
          status: 'DELIVERED',
          page: 0,
          size: 100,
        });

        const bookMap = new Map();
        const coverCache = {};

        const fetchCover = async (bookId) => {
          if (!bookId) return null;
          if (coverCache[bookId] !== undefined) return coverCache[bookId];
          try {
            const book = await bookService.getBookById(bookId);
            coverCache[bookId] = book?.coverUrl || null;
          } catch {
            coverCache[bookId] = null;
          }
          return coverCache[bookId];
        };

        await Promise.all(
          (ordersPage.items || []).map(async (order) => {
            let items = order.items || [];
            if (!items.length && order.id) {
              try {
                const detail = await orderService.getOrderById(order.id);
                items = detail?.items || [];
              } catch {
                items = [];
              }
            }
            for (const item of items) {
              if (!item?.bookId || bookMap.has(item.bookId)) continue;
              bookMap.set(item.bookId, {
                bookId: item.bookId,
                title: item.title || `Sách #${item.bookId}`,
                coverUrl: item.coverUrl || item.bookCoverUrl || null,
              });
            }
          }),
        );

        const books = [...bookMap.values()];
        await Promise.all(
          books.map(async (book) => {
            if (!book.coverUrl) {
              book.coverUrl = await fetchCover(book.bookId);
            }
          }),
        );

        const reviewResults = await Promise.all(
          books.map(async (book) => {
            try {
              const review = await reviewService.getMyReviewForBook(book.bookId);
              return { book, review: review || null };
            } catch {
              return { book, review: null };
            }
          }),
        );

        if (cancelled) return;

        const nextPending = [];
        const nextReviewed = [];
        for (const { book, review } of reviewResults) {
          if (review?.id) {
            nextReviewed.push({ ...book, review });
          } else {
            nextPending.push(book);
          }
        }

        setPending(nextPending);
        setReviewed(nextReviewed);
        if (nextPending.length === 0 && nextReviewed.length > 0) {
          setActiveTab('reviewed');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.message || 'Không thể tải danh sách đánh giá.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReviewSubmitted = (book, review) => {
    setPending((list) => list.filter((item) => item.bookId !== book.bookId));
    setReviewed((list) => [{ ...book, review }, ...list.filter((item) => item.bookId !== book.bookId)]);
    setWritingBookId(null);
    setActiveTab('reviewed');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.review?.id || deleting) return;
    setDeleting(true);
    try {
      await reviewService.deleteReview(deleteTarget.review.id);
      setReviewed((list) => list.filter((item) => item.bookId !== deleteTarget.bookId));
      setPending((list) => {
        const exists = list.some((item) => item.bookId === deleteTarget.bookId);
        if (exists) return list;
        return [
          {
            bookId: deleteTarget.bookId,
            title: deleteTarget.title,
            coverUrl: deleteTarget.coverUrl,
          },
          ...list,
        ];
      });
      setDeleteTarget(null);
      showToast('Đã xóa đánh giá.', 'success');
      setActiveTab('pending');
    } catch (err) {
      showToast(err?.message || 'Không thể xóa đánh giá.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState text={loadError} />;

  const totalBooks = pending.length + reviewed.length;
  const list = activeTab === 'pending' ? pending : reviewed;

  return (
    <div className="my-reviews-page">
      {deleteTarget && (
        <ConfirmDialog
          title="Xóa đánh giá?"
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
          }}
          onConfirm={handleConfirmDelete}
        >
          Bạn có chắc muốn xóa đánh giá cho “{deleteTarget.title}”? Bạn có thể viết lại sau.
        </ConfirmDialog>
      )}

      <div className="admin-filter-tabs my-reviews-tabs" role="tablist" aria-label="Lọc đánh giá">
        {TABS.map((tab) => {
          const count = tab.id === 'pending' ? pending.length : reviewed.length;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`admin-filter-tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {totalBooks === 0 ? (
        <EmptyState text="Chưa có sách nào để đánh giá. Hoàn tất đơn hàng để viết đánh giá." />
      ) : list.length === 0 ? (
        <EmptyState
          text={
            activeTab === 'pending'
              ? 'Bạn đã đánh giá hết sách đã nhận. Cảm ơn bạn!'
              : 'Bạn chưa viết đánh giá nào. Chọn tab Chờ đánh giá để bắt đầu.'
          }
        />
      ) : (
        <ul className="my-reviews-list">
          {activeTab === 'pending'
            ? pending.map((book) => (
                <li key={book.bookId} className="my-reviews-item">
                  <div className="my-reviews-item-main">
                    <Link to={`/books/${book.bookId}`} className="my-reviews-cover-link">
                      <img
                        src={book.coverUrl || coverFallback(book.title)}
                        alt={book.title}
                        className="my-reviews-cover"
                        onError={(e) => {
                          e.currentTarget.src = coverFallback(book.title);
                        }}
                      />
                    </Link>
                    <div className="my-reviews-item-body">
                      <Link to={`/books/${book.bookId}`} className="my-reviews-title">
                        {book.title}
                      </Link>
                      <p className="my-reviews-hint">Đơn đã giao — bạn có thể viết đánh giá.</p>
                      {writingBookId !== book.bookId ? (
                        <Button type="button" size="sm" onClick={() => setWritingBookId(book.bookId)}>
                          Viết đánh giá
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setWritingBookId(null)}
                        >
                          Đóng
                        </Button>
                      )}
                    </div>
                  </div>
                  {writingBookId === book.bookId && (
                    <div className="my-reviews-form-wrap">
                      <ReviewForm
                        bookId={book.bookId}
                        onSubmitted={(review) => handleReviewSubmitted(book, review)}
                      />
                    </div>
                  )}
                </li>
              ))
            : reviewed.map((item) => (
                <li key={item.bookId} className="my-reviews-item my-reviews-item-reviewed">
                  <div className="my-reviews-item-main">
                    <Link to={`/books/${item.bookId}`} className="my-reviews-cover-link">
                      <img
                        src={item.coverUrl || coverFallback(item.title)}
                        alt={item.title}
                        className="my-reviews-cover"
                        onError={(e) => {
                          e.currentTarget.src = coverFallback(item.title);
                        }}
                      />
                    </Link>
                    <div className="my-reviews-item-body">
                      <div className="my-reviews-item-header">
                        <Link to={`/books/${item.bookId}`} className="my-reviews-title">
                          {item.title}
                        </Link>
                        {item.review?.status === 'HIDDEN' && (
                          <span className="status-badge cancelled">Đã ẩn</span>
                        )}
                      </div>
                      <div className="review-stars" aria-label={`${item.review.rating} trên 5 sao`}>
                        {'★'.repeat(item.review.rating)}
                        {'☆'.repeat(5 - item.review.rating)}
                        <strong>{item.review.rating}/5</strong>
                      </div>
                      <p className="my-reviews-comment">
                        {item.review.comment || 'Bạn chỉ chấm điểm, không viết nhận xét.'}
                      </p>
                      <div className="my-reviews-meta">
                        <time dateTime={item.review.createdAt}>
                          {formatDate(item.review.createdAt)}
                        </time>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                        >
                          Xóa đánh giá
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
        </ul>
      )}
    </div>
  );
}
