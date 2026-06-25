import { mockBooks, mockCategories } from '../mocks/mockData';
import { normalizeText } from '../utils/formatters';

export const bookService = {
  getBooks({ query = '', category = 'all', sort = 'title_asc' } = {}) {
    const q = normalizeText(query);
    let books = mockBooks.filter((book) => {
      const matchesQuery = !q || normalizeText(`${book.title} ${book.author}`).includes(q);
      const matchesCategory = category === 'all' || book.category === category;
      return matchesQuery && matchesCategory;
    });

    books = [...books].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'rating_desc') return b.ratingAvg - a.ratingAvg;
      return a.title.localeCompare(b.title);
    });

    return Promise.resolve(books);
  },
  getBookById(id) {
    return Promise.resolve(mockBooks.find((book) => String(book.id) === String(id)) || null);
  },
  getCategories() {
    return Promise.resolve(mockCategories);
  },
};
