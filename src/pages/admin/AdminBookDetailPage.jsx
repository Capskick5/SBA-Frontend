import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { bookService } from '../../services/bookService';

export default function AdminBookDetailPage() {
  const { id } = useParams();
  const [book, setBook] = useState(null);
  useEffect(() => { bookService.getBookById(id).then(setBook); }, [id]);
  if (!book) return <p>Book not found.</p>;
  return (
    <section className="narrow">
      <h1>Edit Book</h1>
      <form className="form">
        <Input label="Title" defaultValue={book.title} />
        <Input label="Author" defaultValue={book.author} />
        <Input label="Price" defaultValue={book.price} />
        <Input label="Stock" defaultValue={book.stock} />
        <Textarea label="Description" defaultValue={book.description} />
        <Button type="button">Save mock</Button>
      </form>
    </section>
  );
}
