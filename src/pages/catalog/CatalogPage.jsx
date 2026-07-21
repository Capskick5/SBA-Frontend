import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import { bannerService } from '../../services/bannerService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';
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
        setError('Could not load books from backend.');
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
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <section className="stack">
        <CatalogFilters
          query={query}
          setQuery={(value) => updateCatalogUrl({ query: value }, { resetPage: true })}
          category={category}
          setCategory={(value) => updateCatalogUrl({ category: value }, { resetPage: true })}
          sort={sort}
          setSort={(value) => updateCatalogUrl({ sort: value }, { resetPage: true })}
          categories={categories}
        />
        {!loading && !error && (
          <p className="muted">
            Showing {showingStart}-{showingEnd} of {totalItems} books
          </p>
        )}
        {loading && <LoadingState text="Loading books..." />}
        {!loading && error && (
          <ErrorState text={error}>
            <button className="btn" type="button" onClick={retryLoadBooks}>
              Retry
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
      </section>
    </div>
  );
}
