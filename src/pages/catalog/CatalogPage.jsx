import { useEffect, useState } from 'react';
import { bookService } from '../../services/bookService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';
import Pagination from '../../components/catalog/Pagination';

const PAGE_SIZE = 10;

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('title_asc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    bookService.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    bookService.getBooks({ query, category, sort }).then(setBooks);
  }, [query, category, sort]);

  const totalPages = Math.ceil(books.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleBooks = books.slice(startIndex, startIndex + PAGE_SIZE);
  const showingStart = books.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + PAGE_SIZE, books.length);

  const resetPageAndSet = (setter) => (value) => {
    setCurrentPage(1);
    setter(value);
  };

  return (
    <section className="stack">
      <div>
        <h1>Catalog</h1>
        <p className="muted">Wireframe catalog using mock book data.</p>
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
        Showing {showingStart}-{showingEnd} of {books.length} books
      </p>
      <BookGrid books={visibleBooks} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </section>
  );
}
