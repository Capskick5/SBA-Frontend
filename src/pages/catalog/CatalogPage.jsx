import { useEffect, useState } from 'react';
import { bookService } from '../../services/bookService';
import CatalogFilters from '../../components/catalog/CatalogFilters';
import BookGrid from '../../components/catalog/BookGrid';

export default function CatalogPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('title_asc');

  useEffect(() => {
    bookService.getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    bookService.getBooks({ query, category, sort }).then(setBooks);
  }, [query, category, sort]);

  return (
    <section className="stack">
      <div>
        <h1>Catalog</h1>
        <p className="muted">Wireframe catalog using mock book data.</p>
      </div>
      <CatalogFilters
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        sort={sort}
        setSort={setSort}
        categories={categories}
      />
      <BookGrid books={books} />
    </section>
  );
}
