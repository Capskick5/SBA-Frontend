import BookCard from './BookCard';
import { EmptyState } from '../ui/State';

export default function BookGrid({ books }) {
  if (!books.length) return <EmptyState text="Khong tim thay sach phu hop." />;
  return <div className="book-grid">{books.map((book) => <BookCard key={book.id} book={book} />)}</div>;
}
