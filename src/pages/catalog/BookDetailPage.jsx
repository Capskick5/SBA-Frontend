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
  Star,
  Truck,
  Users,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { authService } from '../../services/authService';
import { addressService } from '../../services/addressService';
import { bookService } from '../../services/bookService';
import { cartService } from '../../services/cartService';
import { formatProductPrice } from '../../utils/formatters';
import { deriveDiscountPercent, hasSalePrice } from '../../utils/pricing';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { showToast } from '../../utils/toast';

const POLICIES = [
  { icon: Truck, label: 'Delivery time: 2 - 5 business days' },
  { icon: RotateCcw, label: '7-day return policy' },
  { icon: Users, label: 'Wholesale and bulk order policy' },
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
      <span>{stars} {stars === 1 ? 'star' : 'stars'}</span>
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
        <Star size={12} fill="#ffc107" stroke="#ffc107" />
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
        setError('Could not load book detail from backend.');
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

  const onSale = book ? hasSalePrice(book) : false;
  const discountRate = onSale ? deriveDiscountPercent(book.originalPrice, book.price) : 0;
  const isOutOfStock = !book || book.stock <= 0;
  const maxQuantity = book ? Math.max(1, book.stock) : 1;
  const description = book?.description || 'No description available for this book.';
  const isLongDescription = description.length > 480 || description.split('\n').length > 4;
  const reviewCount = book?.reviewCount || 0;
  const ratingValue = book?.ratingAvg ? Number(book.ratingAvg) : 0;

  const specs = useMemo(() => {
    if (!book) return [];

    return [
      { label: 'SKU', value: book.isbn },
      { label: 'Publisher', value: book.publisher },
      { label: 'Author', value: book.author },
      { label: 'Publication year', value: book.publicationYear },
      { label: 'Language', value: book.language },
      { label: 'Pages', value: book.pages },
      { label: 'Category', value: book.category, link: categoryCatalogUrl(book.categoryId) },
      {
        label: 'Stock status',
        value: book.stock > 0 ? `In stock (${book.stock} copies)` : 'Out of stock',
      },
    ].filter((item) => item.value !== null && item.value !== undefined && item.value !== '');
  }, [book]);

  const thumbnails = book ? Array.from({ length: 4 }, () => book.coverUrl) : [];

  const ensureAuthenticated = () => {
    if (authService.getCurrentUser()) return true;
    navigate(`/login?redirect=${encodeURIComponent(`/books/${id}`)}`);
    return false;
  };

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
    if (!ensureAuthenticated()) return;

    setCartLoading(true);
    try {
      const cart = await cartService.addItem(book, quantity);
      notifyCartUpdated(cart);

      if (buyNow) {
        const cartItem = cart.items.find((item) => item.bookId === book.id);
        if (cartItem) {
          navigate(`/checkout?items=${cartItem.itemId}`);
          return;
        }
      }

      showToast(`Added "${book.title}" to cart!`);
    } catch (err) {
      showToast(err?.message || 'Failed to add book to cart.', 'error');
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

  if (!error && String(book?.id || '') !== String(id)) return <LoadingState text="Loading book..." />;
  if (error) {
    return (
      <ErrorState text={error}>
        <button className="btn" type="button" onClick={retryLoadBook}>
          Retry
        </button>
      </ErrorState>
    );
  }
  if (!book) return <ErrorState text="Book not found." />;

  return (
    <section className="book-detail-page">
      <nav className="book-detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">BOOKS</Link>
        <span aria-hidden="true">&gt;</span>
        <Link to={categoryCatalogUrl(book.categoryId)}>{book.category?.toUpperCase() || 'CATEGORY'}</Link>
        <span aria-hidden="true">&gt;</span>
        <span className="book-detail-breadcrumb-current">{book.title}</span>
      </nav>

      <div className="book-detail-layout">
        <aside className="book-detail-aside" aria-label="Product images and purchase actions">
          <div className="book-detail-card book-detail-media-card book-detail-sticky">
            <div className="book-detail-cover-wrap">
              <img
                className="book-detail-cover"
                src={thumbnails[activeThumb] || book.coverUrl}
                alt={book.title}
              />
              {onSale && <span className="book-detail-discount-badge">-{discountRate}%</span>}
            </div>

            <div className="book-detail-thumbs" aria-label="Preview images">
              {thumbnails.map((thumb, index) => (
                <button
                  key={`${thumb}-${index}`}
                  type="button"
                  className={`book-detail-thumb ${index === activeThumb ? 'is-active' : ''}`}
                  onClick={() => setActiveThumb(index)}
                  aria-label={`View image ${index + 1}`}
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
                Add to cart
              </Button>
              <Button
                type="button"
                className="book-detail-btn-buy"
                disabled={isOutOfStock || cartLoading}
                onClick={() => addToCart(true)}
              >
                Buy now
              </Button>
            </div>

            <div className="book-detail-policies">
              <h3>BookVerse benefits</h3>
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
              <MetaItem label="Publisher" value={book.publisher} />
              <MetaItem label="Author" value={book.author} />
              <MetaItem label="Category" value={book.category} />
              <MetaItem label="Language" value={book.language} />
            </div>

            <div className="book-detail-rating-row">
              <div className="book-detail-rating">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    size={15}
                    fill={index < Math.round(ratingValue) ? '#ffc107' : 'transparent'}
                    stroke="#d1d5db"
                  />
                ))}
              </div>
              <span>({reviewCount} reviews)</span>
              <span className="book-detail-meta-divider">|</span>
              <span>{book.soldCount || 0} sold</span>
            </div>

            <div className="book-detail-price-row">
              <strong className="book-detail-price-current">{formatProductPrice(book.price)}</strong>
              {onSale && (
                <span className="book-detail-price-original">{formatProductPrice(book.originalPrice)}</span>
              )}
            </div>

            {onSale && (
              <p className="book-detail-promo-note">
                Promotional pricing applies at BookVerse only
              </p>
            )}

            {book.stock > 0 && (
              <div className="book-detail-stock-banner">
                In stock online. Remaining quantity: <strong>{book.stock}</strong> copies.
              </div>
            )}
          </div>

          <div className="book-detail-card">
            <h2 className="book-detail-section-title">Shipping information</h2>
            <div className="book-detail-shipping-block">
              <div className="book-detail-shipping-line">
                <MapPin size={18} />
                <div className="book-detail-shipping-copy">
                  <span>Deliver to</span>
                  {!deliveryAddressReady ? (
                    <strong className="book-detail-shipping-placeholder">Loading...</strong>
                  ) : (
                    deliveryAddress && <strong>{formatDeliveryAddress(deliveryAddress)}</strong>
                  )}
                </div>
                {deliveryAddressReady && (
                  <button type="button" className="book-detail-link-btn" onClick={handleChangeShipping}>
                    {deliveryAddress ? 'Change' : 'Add information'}
                  </button>
                )}
              </div>
              <div className="book-detail-shipping-line">
                <Truck size={18} />
                <div>
                  <span>Standard delivery</span>
                  <strong>Estimated delivery in 2 - 5 business days</strong>
                </div>
              </div>
            </div>

            <div className="book-detail-field-row">
              <span className="book-detail-field-label">Quantity</span>
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
            <h2 className="book-detail-section-title">Product details</h2>
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
            <h2 className="book-detail-section-title">Product description</h2>
            <h3 className="book-detail-description-title">{book.title}</h3>
            <div
              className={`book-detail-description ${
                isLongDescription && !descriptionExpanded ? 'is-collapsed' : ''
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
                {descriptionExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="book-detail-card book-detail-reviews-card">
        <h2 className="book-detail-section-title">Customer reviews</h2>
        <div className="book-detail-reviews">
          <div className="book-detail-review-score">
            <strong>{ratingValue.toFixed(1)}/5</strong>
            <div className="book-detail-rating">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={18}
                  fill={index < Math.round(ratingValue) ? '#ffc107' : 'transparent'}
                  stroke="#d1d5db"
                />
              ))}
            </div>
            <span>({reviewCount} reviews)</span>
          </div>

          <div className="book-detail-review-bars">
            {[5, 4, 3, 2, 1].map((stars) => (
              <StarBreakdownRow key={stars} stars={stars} percent={0} />
            ))}
          </div>

          <p className="book-detail-review-note">
            Only members can write reviews. Please{' '}
            <Link to={`/login?redirect=${encodeURIComponent(`/books/${book.id}`)}`}>log in</Link>{' '}
            or <Link to="/register">register</Link>.
          </p>
        </div>
      </div>

      {relatedBooks.length > 0 && (
        <div className="book-detail-card book-detail-related-section">
          <h2 className="book-detail-section-title">Recommended by BookVerse</h2>

          <div className="book-detail-related-carousel">
            <button
              type="button"
              className="book-detail-related-arrow"
              aria-label="Scroll left"
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
              aria-label="Scroll right"
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
