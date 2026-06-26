import { apiGet } from './apiClient';

const coverFor = (book) => `https://placehold.co/240x340?text=${encodeURIComponent(book.title || 'Book')}`;

function mapBook(book) {
  return {
    ...book,
    category: book.category?.name || 'General',
    categoryId: book.category?.id,
    coverUrl: book.coverUrl || coverFor(book),
    ratingAvg: Number(book.ratingAvg || 0),
  };
}

function mapSort(sort) {
  if (sort === 'title_asc') return 'title,asc';
  return sort;
}

export const bookService = {
  async getBooks({ query = '', category = 'all', sort = 'title_asc' } = {}) {
    const page = await apiGet('/books', {
      query,
      categoryId: category === 'all' ? undefined : category,
      sort: mapSort(sort),
      page: 0,
      size: 200,
    });

    return (page.items || []).map(mapBook);
  },
  async getBookById(id) {
    const book = await apiGet(`/books/${id}`);
    return mapBook(book);
  },
  async getCategories() {
    const page = await apiGet('/categories', { page: 0, size: 100 });
    return page.items || [];
  },
};
