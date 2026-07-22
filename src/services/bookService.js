import { apiGet } from '../api/apiClient';
import { formatCategoryName } from '../utils/formatters';

const coverFor = (book) => `https://placehold.co/240x340?text=${encodeURIComponent(book.title || 'Book')}`;

function mapBook(book) {
  const rawCatName = typeof book.category === 'object' ? book.category?.name : book.category;
  return {
    ...book,
    category: formatCategoryName(rawCatName || 'Tổng hợp'),
    categoryId: book.category?.id,
    coverUrl: book.coverUrl || coverFor(book),
    ratingAvg: Number(book.ratingAvg ?? 0),
    reviewCount: Number(book.reviewCount ?? 0),
    soldCount: Number(book.soldCount ?? 0),
  };
}

function mapSort(sort) {
  if (sort === 'title_asc') return 'title,asc';
  return sort;
}

export const bookService = {
  async getBooks({ query = '', category = 'all', sort = 'title_asc', page = 0, size = 20 } = {}) {
    const pageData = await apiGet('/books', {
      query,
      categoryId: category === 'all' ? undefined : category,
      sort: mapSort(sort),
      page,
      size,
    });

    return {
      ...pageData,
      items: (pageData.items || []).map(mapBook),
    };
  },
  async getBookById(id) {
    const book = await apiGet(`/books/${id}`);
    return mapBook(book);
  },
  async getCategories() {
    const page = await apiGet('/categories', { page: 0, size: 100 });
    return (page.items || []).map((cat) => ({
      ...cat,
      name: formatCategoryName(cat.name),
    }));
  },
};
