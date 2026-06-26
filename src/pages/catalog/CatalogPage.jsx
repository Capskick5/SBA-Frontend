import { useEffect, useState } from 'react';
import { bookService } from '../../services/bookService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';

const PAGE_SIZE = 20;

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('title_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');

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

  const resetPageAndSet = (setter) => (value) => {
    setCurrentPage(1);
    setter(value);
  };

  return (
    <section className="stack">
      <div>
        <h1>Catalog</h1>
        <p className="muted">Browse available books from BookVerse.</p>
      </div>
      <CatalogFilters
        query={query}
        setQuery={resetPageAndSet(setQuery)}
        category={category}
        setCategory={resetPageAndSet(setCategory)}
        sort={sort}
        setSort={resetPageAndSet(setSort)}
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
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
