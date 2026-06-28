import BookCard from './BookCard';
import { EmptyState } from '../ui/State';

export default function BookGrid({ books }) {
  if (!books.length) return <EmptyState text="No matching books found." />;
  return <div className="book-grid">{books.map((book) => <BookCard key={book.id} book={book} />)}</div>;
}
