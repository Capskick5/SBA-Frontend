import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';
import { ErrorState, LoadingState } from '../../components/ui/State';

import banner1 from '../../assets/banner1.jpg';
import banner2 from '../../assets/banner2.jpg';

const BANNERS = [
  {
    image: banner1,
    title: "Explore BookVerse",
    subtitle: "Discover your next favorite read from our curated digital library, assisted by AI."
  },
  {
    image: banner2,
    title: "AI-Powered Bookstore",
    subtitle: "Chat with our AI assistant to find the perfect book customized just for you."
  }
];

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
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % BANNERS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="hero-banner-slider">
        {BANNERS.map((b, index) => (
          <div
            key={index}
            className={`hero-banner ${index === activeBanner ? 'active' : ''}`}
            style={{
              backgroundImage: `url(${b.image})`
            }}
          />
        ))}
        <div className="banner-dots">
          {BANNERS.map((_, index) => (
            <button
              key={index}
              className={`banner-dot ${index === activeBanner ? 'active' : ''}`}
              onClick={() => setActiveBanner(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
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
