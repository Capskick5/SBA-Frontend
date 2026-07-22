import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { bannerService } from '../../services/bannerService';
import { authService } from '../../services/authService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';
import CampaignModal from '../../components/campaign/CampaignModal';
import { ErrorState, LoadingState } from '../../components/ui/State';

const PAGE_SIZE = 20;
const DEFAULT_SORT = 'relevance';
const DEFAULT_CATEGORY = 'all';

function pageFromParam(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [banners, setBanners] = useState([]);
  const [activeBanner, setActiveBanner] = useState(0);

  // Check login state for Guest vs User
  const isLoggedIn = Boolean(authService.getCurrentUser());

  // Full-screen Campaign Modal state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  useEffect(() => {
    bannerService.list().then(setBanners).catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const query = searchParams.get('query') || '';
  const category = searchParams.get('category') || DEFAULT_CATEGORY;
  const sort = searchParams.get('sort') || DEFAULT_SORT;
  const currentPage = pageFromParam(searchParams.get('page'));

  useEffect(() => {
    bookService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadBooks = useCallback(() => {
    let active = true;

    bookService
      .getBooks({ query, category, sort, page: currentPage - 1, size: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setBooks(result.items);
        setTotalItems(result.totalItems);
        setTotalPages(result.totalPages);
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setBooks([]);
        setTotalItems(0);
        setTotalPages(0);
        setError('Không thể tải danh sách sách từ máy chủ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, category, sort, currentPage]);

  useEffect(() => loadBooks(), [loadBooks, retryCount]);

  const showingStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min((currentPage - 1) * PAGE_SIZE + books.length, totalItems);

  const updateCatalogUrl = (changes, { resetPage = false } = {}) => {
    setLoading(true);
    setError('');

    const nextParams = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
      const stringValue = String(value || '').trim();
      const isDefault =
        (key === 'query' && stringValue === '') ||
        (key === 'category' && stringValue === DEFAULT_CATEGORY) ||
        (key === 'sort' && stringValue === DEFAULT_SORT) ||
        (key === 'page' && stringValue === '1');

      if (isDefault) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, stringValue);
      }
    });

    if (resetPage) {
      nextParams.delete('page');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const retryLoadBooks = () => {
    setLoading(true);
    setError('');
    setRetryCount((count) => count + 1);
  };

  return (
    <div className="catalog-container">
      {/* Hero Banner Slider */}
      {banners.length > 0 && (
        <div className="hero-banner-slider">
          {banners.map((banner, index) => {
            const slideClassName = `hero-banner ${index === activeBanner ? 'active' : ''}`;
            const slideStyle = { backgroundImage: `url(${banner.imageUrl})` };

            if (!banner.linkUrl) {
              return (
                <div key={banner.id} className={slideClassName} style={slideStyle} title={banner.title} />
              );
            }
            return banner.linkUrl.startsWith('/') ? (
              <Link
                key={banner.id}
                to={banner.linkUrl}
                className={slideClassName}
                style={slideStyle}
                aria-label={banner.title}
              />
            ) : (
              <a
                key={banner.id}
                href={banner.linkUrl}
                className={slideClassName}
                style={slideStyle}
                aria-label={banner.title}
                target="_blank"
                rel="noreferrer"
              />
            );
          })}
          {banners.length > 1 && (
            <div className="banner-dots">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  className={`banner-dot ${index === activeBanner ? 'active' : ''}`}
                  onClick={() => setActiveBanner(index)}
                  aria-label={`Chuyển đến slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discrete & High-Converting Campaign Trigger Banner - Shown ONLY when Logged In */}
      {isLoggedIn && (
        <section className="campaigns-trigger-bar">
          <div className="trigger-bar-left">
            <div className="trigger-icon-pulse">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="trigger-badge">🔥 CHIẾN DỊCH KHUYẾN MÃI ĐANG DIỄN RA</div>
              <h3>Kho Voucher & Campaign Khuyến Mãi</h3>
              <p>Khám phá các ưu đãi giờ vàng, thu thập trực tiếp mã giảm giá về ví cá nhân chỉ với 1 cú click!</p>
            </div>
          </div>
          <div className="trigger-bar-right">
            <button
              type="button"
              className="btn-open-campaign-modal"
              onClick={() => setIsCampaignModalOpen(true)}
            >
              Săn Voucher Ngay <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* Full-Screen Dynamic Campaign Modal Experience */}
      {isLoggedIn && (
        <CampaignModal
          isOpen={isCampaignModalOpen}
          onClose={() => setIsCampaignModalOpen(false)}
        />
      )}

      {/* 2-Column Catalog Layout: Left Sidebar + Main Product Grid */}
      <section className="catalog-layout">
        <aside className="catalog-sidebar">
          <CatalogFilters
            query={query}
            setQuery={(value) => updateCatalogUrl({ query: value }, { resetPage: true })}
            category={category}
            setCategory={(value) => updateCatalogUrl({ category: value }, { resetPage: true })}
            sort={sort}
            setSort={(value) => updateCatalogUrl({ sort: value }, { resetPage: true })}
            categories={categories}
          />
        </aside>

        <main className="catalog-content">
          {!loading && !error && (
            <div className="catalog-content-header">
              <p className="catalog-results-count">
                Hiển thị <strong>{showingStart}-{showingEnd}</strong> trong tổng số <strong>{totalItems}</strong> cuốn sách
              </p>

              <div className="catalog-sort-wrapper">
                <label htmlFor="catalog-sort-select" className="catalog-sort-label">
                  Sắp xếp:
                </label>
                <select
                  id="catalog-sort-select"
                  className="catalog-sort-select"
                  value={sort}
                  onChange={(e) => updateCatalogUrl({ sort: e.target.value }, { resetPage: true })}
                >
                  <option value="relevance">Mới & Liên quan</option>
                  <option value="sold_desc">Bán chạy nhất</option>
                  <option value="rating_desc">Đánh giá cao</option>
                  <option value="title_asc">Tên A - Z</option>
                  <option value="price_asc">Giá thấp → cao</option>
                  <option value="price_desc">Giá cao → thấp</option>
                </select>
              </div>
            </div>
          )}

          {loading && <LoadingState text="Đang tải danh sách sách..." />}
          {!loading && error && (
            <ErrorState text={error}>
              <button className="btn" type="button" onClick={retryLoadBooks}>
                Thử lại
              </button>
            </ErrorState>
          )}
          {!loading && !error && (
            <>
              <BookGrid books={books} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => updateCatalogUrl({ page })}
              />
            </>
          )}
        </main>
      </section>
    </div>
  );
}
