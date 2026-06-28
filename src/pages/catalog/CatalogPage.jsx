import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';

const PAGE_SIZE = 20;
const DEFAULT_SORT = 'title_asc';
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
  const [error, setError] = useState('');

  const query = searchParams.get('query') || '';
  const category = searchParams.get('category') || DEFAULT_CATEGORY;
  const sort = searchParams.get('sort') || DEFAULT_SORT;
  const currentPage = pageFromParam(searchParams.get('page'));

  useEffect(() => {
    bookService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    bookService
      .getBooks({ query, category, sort, page: currentPage - 1, size: PAGE_SIZE })
      .then((result) => {
        setBooks(result.items);
        setTotalItems(result.totalItems);
        setTotalPages(result.totalPages);
        setError('');
      })
      .catch(() => {
        setBooks([]);
        setTotalItems(0);
        setTotalPages(0);
        setError('Could not load books from backend.');
      });
  }, [query, category, sort, currentPage]);

  const showingStart = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min((currentPage - 1) * PAGE_SIZE + books.length, totalItems);

  const updateCatalogUrl = (changes, { resetPage = false } = {}) => {
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

  return (
    <section className="stack">
      <div>
        <h1>Catalog</h1>
        <p className="muted">Browse available books from BookVerse.</p>
      </div>
      <CatalogFilters
        query={query}
        setQuery={(value) => updateCatalogUrl({ query: value }, { resetPage: true })}
        category={category}
        setCategory={(value) => updateCatalogUrl({ category: value }, { resetPage: true })}
        sort={sort}
        setSort={(value) => updateCatalogUrl({ sort: value }, { resetPage: true })}
        categories={categories}
      />
      <p className="muted">
        Showing {showingStart}-{showingEnd} of {totalItems} books
      </p>
      {error && <p className="form-error">{error}</p>}
      <BookGrid books={books} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => updateCatalogUrl({ page })}
      />
    </section>
  );
}
