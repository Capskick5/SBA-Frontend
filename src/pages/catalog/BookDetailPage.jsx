import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import StarRating from '../../components/ui/StarRating';
import { ErrorState, LoadingState } from '../../components/ui/State';
import ReviewForm from '../../components/reviews/ReviewForm';
import ReviewList from '../../components/reviews/ReviewList';
import Pagination from '../../components/catalog/Pagination';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { addressService } from '../../services/addressService';
import { bookService } from '../../services/bookService';
import { cartFacade } from '../../services/cartFacade';
import { reviewService } from '../../services/reviewService';
import { formatProductPrice } from '../../utils/formatters';
import { deriveDiscountPercent, hasSalePrice } from '../../utils/pricing';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { showToast } from '../../utils/toast';
import { getPendingPaymentUserMessage } from '../../utils/pendingOrderGuard';

const POLICIES = [
  { icon: Truck, label: 'Thời gian giao hàng: 2 - 5 ngày làm việc' },
  { icon: RotateCcw, label: 'Chính sách đổi trả trong 7 ngày' },
  { icon: Users, label: 'Chính sách đặt sách số lượng lớn / bán buôn' },
];

function SpecRow({ label, value, link }) {
  if (!value) return null;

  return (
    <div className="book-detail-spec-row">
      <span className="book-detail-spec-label">{label}</span>
      {link ? (
        <Link className="book-detail-spec-link" to={link}>
          {value}
        </Link>
      ) : (
        <span className="book-detail-spec-value">{value}</span>
      )}
    </div>
  );
}

function MetaItem({ label, value }) {
  if (!value) return null;

  return (
    <div className="book-detail-meta-item">
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

function StarBreakdownRow({ stars, percent = 0 }) {
  return (
    <div className="book-detail-review-bar-row">
      <span>{stars} sao</span>
      <div className="book-detail-review-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span>{percent}%</span>
    </div>
  );
}

function RelatedBookCard({ book }) {
  const onSale = hasSalePrice(book);
  const discountRate = onSale ? deriveDiscountPercent(book.originalPrice, book.price) : 0;
  const rating = book.ratingAvg ? Number(book.ratingAvg).toFixed(1) : '0';

  return (
    <article className="book-detail-related-card">
      <Link className="book-detail-related-cover" to={`/books/${book.id}`}>
        <img src={book.coverUrl} alt={book.title} loading="lazy" />
        {onSale && <span className="book-detail-related-badge">-{discountRate}%</span>}
      </Link>
      <h3 className="book-detail-related-title">
        <Link to={`/books/${book.id}`} title={book.title}>
          {book.title}
        </Link>
      </h3>
      <div className="book-detail-related-pricing">
        <strong>{formatProductPrice(book.price)}</strong>
        {onSale && (
          <>
            <span className="book-detail-related-original">{formatProductPrice(book.originalPrice)}</span>
            <span className="book-detail-related-discount">-{discountRate}%</span>
          </>
        )}
      </div>
      <div className="book-detail-related-rating">
        <StarRating value={book.ratingAvg || 0} size={12} />
        <span>{rating}</span>
        <span>({book.reviewCount || 0})</span>
      </div>
    </article>
  );
}

function formatDeliveryAddress(address) {
  if (!address) return '';

  const parts = [address.district, address.city].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return address.city || '';
}

function categoryCatalogUrl(categoryId) {
  return categoryId ? `/?category=${categoryId}` : '/';
}

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState(null);
  const [deliveryAddressReady, setDeliveryAddressReady] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewTotalPages, setReviewTotalPages] = useState(0);
  const [myReview, setMyReview] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const relatedScrollRef = useRef(null);

  useEffect(() => {
    const updateStickyTop = () => {
      const navbar = document.querySelector('.navbar');
      const offset = navbar ? navbar.getBoundingClientRect().height + 16 : 112;
      document.documentElement.style.setProperty('--book-detail-sticky-top', `${offset}px`);
    };

    updateStickyTop();
    window.addEventListener('resize', updateStickyTop);
    return () => window.removeEventListener('resize', updateStickyTop);
  }, []);

  useEffect(() => {
    if (!authService.getCurrentUser()) {
      Promise.resolve().then(() => {
        setDeliveryAddress(null);
        setDeliveryAddressReady(true);
      });
      return undefined;
    }

    let active = true;
    Promise.resolve().then(() => setDeliveryAddressReady(false));

    addressService
      .list()
      .then((addresses) => {
        if (!active) return;
        const preferred = addresses.find((address) => address.isDefault) || addresses[0] || null;
        setDeliveryAddress(preferred);
      })
      .catch(() => {
        if (active) setDeliveryAddress(null);
      })
      .finally(() => {
        if (active) setDeliveryAddressReady(true);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    bookService
      .getBookById(id)
      .then((result) => {
        if (!active) return;
        setBook(result);
        setError('');
        setQuantity(1);
        setActiveThumb(0);
        setDescriptionExpanded(false);
      })
      .catch(() => {
        if (!active) return;
        setBook(null);
        setError('Không thể tải chi tiết sách từ máy chủ.');
      });

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  useEffect(() => {
    if (!book?.categoryId) {
      Promise.resolve().then(() => setRelatedBooks([]));
      return undefined;
    }

    let active = true;

    bookService
      .getBooks({ category: book.categoryId, sort: 'title_asc', page: 0, size: 16 })
      .then((result) => {
        if (!active) return;
        setRelatedBooks((result.items || []).filter((item) => item.id !== book.id));
      })
      .catch(() => {
        if (active) setRelatedBooks([]);
      });

    return () => {
      active = false;
    };
  }, [book?.id, book?.categoryId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setReviewsLoading(true);
      setReviewsError('');
    });

    reviewService
      .getReviewsByBookId(id, { page: reviewPage, size: 5 })
      .then((result) => {
        if (!active) return;
        setReviews(result.items);
        setReviewTotal(result.totalItems);
        setReviewTotalPages(result.totalPages);
      })
      .catch((err) => {
        if (!active) return;
        setReviews([]);
        setReviewTotal(0);
        setReviewsError(err?.message || 'Không thể tải đánh giá từ khách hàng.');
      })
      .finally(() => {
        if (active) setReviewsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reviewPage]);

  useEffect(() => {
    let active = true;
    reviewService.getReviewSummary(id)
      .then((summary) => {
        if (active) setReviewSummary(summary);
      })
      .catch(() => {
        if (active) setReviewSummary(null);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (user?.role !== 'CUSTOMER') {
      Promise.resolve().then(() => setMyReview(null));
      return undefined;
    }
    let active = true;
    reviewService.getMyReviewForBook(id)
      .then((review) => {
        if (active) setMyReview(review || null);
      })
      .catch(() => {
        if (active) setMyReview(null);
      });
    return () => {
      active = false;
    };
  }, [id, user?.role]);

  useEffect(() => {
    if (book && window.location.hash === '#reviews') {
      window.requestAnimationFrame(() => {
        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [book]);

  const onSale = book ? hasSalePrice(book) : false;
  const discountRate = onSale ? deriveDiscountPercent(book.originalPrice, book.price) : 0;
  const isOutOfStock = !book || book.stock <= 0;
  const maxQuantity = book ? Math.max(1, book.stock) : 1;
  const description = book?.description || 'Chưa có mô tả cho cuốn sách này.';
  const isLongDescription = description.length > 480 || description.split('\n').length > 4;
  // Prefer live review list/summary over denormalized book fields (those can be stale).
  const reviewCount = Math.max(
    Number(reviewSummary?.totalReviews || 0),
    Number(reviewTotal || 0),
    Number(book?.reviewCount || 0),
  );
  const ratingValue = Number(
    reviewSummary?.averageRating != null
      ? reviewSummary.averageRating
      : (book?.ratingAvg || 0),
  );
  const currentUserReview = myReview;
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    percent: reviewCount > 0
      ? Math.round((Number(reviewSummary?.ratingCounts?.[stars] || 0) / reviewCount) * 100)
      : 0,
  }));

  const specs = useMemo(() => {
    if (!book) return [];

    return [
      { label: 'SKU', value: book.isbn },
      { label: 'Nhà xuất bản', value: book.publisher },
      { label: 'Tác giả', value: book.author },
      { label: 'Năm xuất bản', value: book.publicationYear },
      { label: 'Ngôn ngữ', value: book.language },
      { label: 'Số trang', value: book.pages },
      { label: 'Danh mục', value: book.category, link: categoryCatalogUrl(book.categoryId) },
      {
        label: 'Tình trạng kho',
        value: book.stock > 0 ? `Còn hàng (${book.stock} cuốn)` : 'Hết hàng',
      },
    ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');
  }, [book]);

  const thumbnails = book ? Array.from({ length: 4 }, () => book.coverUrl) : [];

  const changeQuantity = (delta) => {
    setQuantity((current) => Math.min(maxQuantity, Math.max(1, current + delta)));
  };

  const handleChangeShipping = () => {
    const returnPath = `/books/${id}`;
    const addressesPath = `/profile/addresses?redirect=${encodeURIComponent(returnPath)}`;

    if (!authService.getCurrentUser()) {
      navigate(`/login?redirect=${encodeURIComponent(addressesPath)}`);
      return;
    }

    navigate(addressesPath);
  };

  const addToCart = async (buyNow = false) => {
    if (!book || isOutOfStock) return;

    setCartLoading(true);
    try {
      const cart = await cartFacade.addItem(book, quantity);
      notifyCartUpdated(cart);

      if (buyNow) {
        const cartItem = cart.items.find((item) => String(item.bookId) === String(book.id));
        if (cartItem) {
          navigate(`/checkout?items=${encodeURIComponent(cartItem.itemId)}`);
          return;
        }
      }

      showToast(`Đã thêm "${book.title}" vào giỏ!`);
    } catch (err) {
      showToast(
        getPendingPaymentUserMessage(err) || err?.message || 'Không thể thêm sách vào giỏ.',
        'error',
      );
    } finally {
      setCartLoading(false);
    }
  };

  const retryLoadBook = () => {
    setBook(null);
    setError('');
    setRetryCount((count) => count + 1);
  };

  const scrollRelated = (direction) => {
    const track = relatedScrollRef.current;
    if (!track) return;
    const cardWidth = track.querySelector('.book-detail-related-card')?.offsetWidth || 240;
    track.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
  };

  const handleReviewSubmitted = (review) => {
    setMyReview(review);
    setReviewPage(0);
    setReviews((current) => [review, ...current]);
    setReviewTotal((current) => current + 1);
    setReviewSummary((current) => {
      const previousTotal = Number(current?.totalReviews ?? book?.reviewCount ?? 0);
      const previousAverage = Number(current?.averageRating ?? book?.ratingAvg ?? 0);
      return {
        averageRating: ((previousAverage * previousTotal) + Number(review.rating)) / (previousTotal + 1),
        totalReviews: previousTotal + 1,
        ratingCounts: {
          ...(current?.ratingCounts || {}),
          [review.rating]: Number(current?.ratingCounts?.[review.rating] || 0) + 1,
        },
      };
    });
    setBook((current) => {
      if (!current) return current;
      const previousCount = Number(current.reviewCount || 0);
      const previousAverage = Number(current.ratingAvg || 0);
      return {
        ...current,
        reviewCount: previousCount + 1,
        ratingAvg: ((previousAverage * previousCount) + Number(review.rating)) / (previousCount + 1),
      };
    });
  };

  if (!error && String(book?.id || '') !== String(id)) return <LoadingState text="Đang tải sách..." />;
  if (error) {
    return (
      <ErrorState text={error}>
        <button className="btn" type="button" onClick={retryLoadBook}>
          Thử lại
        </button>
      </ErrorState>
    );
  }
  if (!book) return <ErrorState text="Không tìm thấy sách." />;

  return (
    <section className="book-detail-page">
      <nav className="book-detail-breadcrumb" aria-label="Đường dẫn">
        <Link to="/">SÁCH</Link>
        <span aria-hidden="true">&gt;</span>
        <Link to={categoryCatalogUrl(book.categoryId)}>{book.category?.toUpperCase() || 'DANH MỤC'}</Link>
        <span aria-hidden="true">&gt;</span>
        <span className="book-detail-breadcrumb-current">{book.title}</span>
      </nav>

      <div className="book-detail-layout">
        <aside className="book-detail-aside" aria-label="Hình ảnh sản phẩm và thao tác mua hàng">
          <div className="book-detail-card book-detail-media-card book-detail-sticky">
            <div className="book-detail-cover-wrap">
              <img
                className="book-detail-cover"
                src={thumbnails[activeThumb] || book.coverUrl}
                alt={book.title}
              />
              {onSale && <span className="book-detail-discount-badge">-{discountRate}%</span>}
            </div>

            <div className="book-detail-thumbs" aria-label="Ảnh xem trước">
              {thumbnails.map((thumb, index) => (
                <button
                  key={`${thumb}-${index}`}
                  type="button"
                  className={`book-detail-thumb ${index === activeThumb ? 'is-active' : ''}`}
                  onClick={() => setActiveThumb(index)}
                  aria-label={`Xem ảnh ${index + 1}`}
                >
                  <img src={thumb} alt="" />
                </button>
              ))}
            </div>

            <div className="book-detail-action-row">
              <Button
                type="button"
                className="book-detail-btn-outline"
                disabled={isOutOfStock || cartLoading}
                onClick={() => addToCart(false)}
              >
                <ShoppingCart size={18} />
                Thêm vào giỏ
              </Button>
              <Button
                type="button"
                className="book-detail-btn-buy"
                disabled={isOutOfStock || cartLoading}
                onClick={() => addToCart(true)}
              >
                Mua ngay
              </Button>
            </div>

            <div className="book-detail-policies">
              <h3>Quyền lợi BookVerse</h3>
              <ul>
                {POLICIES.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <span className="book-detail-policy-icon">
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                    <ChevronRight size={16} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <div className="book-detail-content">
          <div className="book-detail-card book-detail-summary-card">
            <h1 className="book-detail-title">{book.title}</h1>

            <div className="book-detail-meta-grid">
              <MetaItem label="Nhà xuất bản" value={book.publisher} />
              <MetaItem label="Tác giả" value={book.author} />
              <MetaItem label="Danh mục" value={book.category} />
              <MetaItem label="Ngôn ngữ" value={book.language} />
            </div>

            <div className="book-detail-rating-row">
              <StarRating value={ratingValue} size={15} className="book-detail-rating" />
              <span>({reviewCount} đánh giá)</span>
              <span className="book-detail-meta-divider">|</span>
              <span>Đã bán {book.soldCount || 0}</span>
            </div>

            <div className="book-detail-price-row">
              <strong className="book-detail-price-current">{formatProductPrice(book.price)}</strong>
              {onSale && (
                <span className="book-detail-price-original">{formatProductPrice(book.originalPrice)}</span>
              )}
            </div>

            {onSale && (
              <p className="book-detail-promo-note">
                Giá khuyến mãi chỉ áp dụng tại BookVerse
              </p>
            )}

            {book.stock > 0 && (
              <div className="book-detail-stock-banner">
                Còn hàng trực tuyến. Số lượng còn lại: <strong>{book.stock}</strong> cuốn.
              </div>
            )}
          </div>

          <div className="book-detail-card">
            <h2 className="book-detail-section-title">Thông tin giao hàng</h2>
            <div className="book-detail-shipping-block">
              <div className="book-detail-shipping-line">
                <MapPin size={18} />
                <div className="book-detail-shipping-copy">
                  <span>Giao đến</span>
                  {!deliveryAddressReady ? (
                    <strong className="book-detail-shipping-placeholder">Đang tải...</strong>
                  ) : (
                    deliveryAddress && <strong>{formatDeliveryAddress(deliveryAddress)}</strong>
                  )}
                </div>
                {deliveryAddressReady && (
                  <button type="button" className="book-detail-link-btn" onClick={handleChangeShipping}>
                    {deliveryAddress ? 'Thay đổi' : 'Thêm thông tin'}
                  </button>
                )}
              </div>
              <div className="book-detail-shipping-line">
                <Truck size={18} />
                <div>
                  <span>Giao hàng tiêu chuẩn</span>
                  <strong>Dự kiến giao trong 2 - 5 ngày làm việc</strong>
                </div>
              </div>
            </div>

            <div className="book-detail-field-row">
              <span className="book-detail-field-label">Số lượng</span>
              <div className="book-detail-quantity">
                <button type="button" onClick={() => changeQuantity(-1)} disabled={quantity <= 1}>
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={quantity}
                  onChange={(event) => {
                    const next = Number(event.target.value) || 1;
                    setQuantity(Math.min(maxQuantity, Math.max(1, next)));
                  }}
                />
                <button
                  type="button"
                  onClick={() => changeQuantity(1)}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="book-detail-card">
            <h2 className="book-detail-section-title">Chi tiết sản phẩm</h2>
            <div className="book-detail-specs-list">
              {specs.map((item) => (
                <SpecRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  link={item.link}
                />
              ))}
            </div>
          </div>

          <div className="book-detail-card">
            <h2 className="book-detail-section-title">Mô tả sản phẩm</h2>
            <h3 className="book-detail-description-title">{book.title}</h3>
            <div
              className={`book-detail-description ${isLongDescription && !descriptionExpanded ? 'is-collapsed' : ''
                }`}
            >
              <p>{description}</p>
            </div>
            {isLongDescription && (
              <button
                type="button"
                className="book-detail-expand-btn"
                onClick={() => setDescriptionExpanded((expanded) => !expanded)}
              >
                {descriptionExpanded ? 'Thu gọn' : 'Xem thêm'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="book-detail-card book-detail-reviews-card" id="reviews">
        <h2 className="book-detail-section-title">Đánh giá từ khách hàng</h2>
        <div className="book-detail-reviews">
          <div className="book-detail-review-score">
            <strong>{ratingValue.toFixed(1)}/5</strong>
            <StarRating value={ratingValue} size={18} className="book-detail-rating" />
            <span>({reviewCount} đánh giá)</span>
          </div>

          <div className="book-detail-review-bars">
            {ratingBreakdown.map(({ stars, percent }) => (
              <StarBreakdownRow key={stars} stars={stars} percent={percent} />
            ))}
          </div>

          <div className="book-detail-review-action">
            {!user ? (
              <p className="book-detail-review-note">
                Đã mua cuốn sách này? Vui lòng{' '}
                <Link to={`/login?redirect=${encodeURIComponent(`/books/${book.id}#reviews`)}`}>đăng nhập</Link>{' '}
                để chia sẻ đánh giá sau khi nhận hàng.
              </p>
            ) : user.role !== 'CUSTOMER' ? (
              <p className="book-detail-review-note">Tài khoản khách hàng mới có thể gửi đánh giá đã mua hàng.</p>
            ) : currentUserReview ? (
              <div className="book-detail-review-complete">
                <strong>{currentUserReview.status === 'HIDDEN' ? 'Đánh giá của bạn đang được kiểm duyệt' : 'Đánh giá của bạn đã được đăng'}</strong>
                <span>{currentUserReview.rating}/5 sao</span>
                <p>{currentUserReview.status === 'HIDDEN'
                  ? 'Đánh giá này hiện đang ẩn khỏi danh sách công khai.'
                  : 'Bạn có thể tìm thấy nó trong phần đánh giá bên dưới.'}</p>
              </div>
            ) : (
              <ReviewForm bookId={book.id} onSubmitted={handleReviewSubmitted} />
            )}
          </div>
        </div>

        <div className="book-detail-review-list-section">
          <div className="book-detail-review-list-heading">
            <h3>Đánh giá từ khách hàng đã mua</h3>
            <span>{reviewCount} tổng cộng</span>
          </div>
          {reviewsLoading ? (
            <LoadingState text="Đang tải đánh giá..." />
          ) : reviewsError ? (
            <ErrorState text={reviewsError} />
          ) : (
            <>
              <ReviewList reviews={reviews} />
              <Pagination
                currentPage={reviewPage + 1}
                totalPages={reviewTotalPages}
                onPageChange={(page) => setReviewPage(page - 1)}
              />
            </>
          )}
        </div>
      </div>

      {relatedBooks.length > 0 && (
        <div className="book-detail-card book-detail-related-section">
          <h2 className="book-detail-section-title">Gợi ý từ BookVerse</h2>

          <div className="book-detail-related-carousel">
            <button
              type="button"
              className="book-detail-related-arrow"
              aria-label="Cuộn trái"
              onClick={() => scrollRelated(-1)}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="book-detail-related-scroll" ref={relatedScrollRef}>
              {relatedBooks.map((relatedBook) => (
                <RelatedBookCard key={relatedBook.id} book={relatedBook} />
              ))}
            </div>

            <button
              type="button"
              className="book-detail-related-arrow"
              aria-label="Cuộn phải"
              onClick={() => scrollRelated(1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
