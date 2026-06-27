import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { adminService } from '../../services/adminService';

export default function AdminBookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminService.getBookById(id).then(setBook);
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.target);
      const values = Object.fromEntries(formData.entries());
      const data = {
        title: values.title,
        author: values.author,
        categoryId: Number(values.categoryId),
        price: Number(values.price),
        originalPrice: Number(values.originalPrice || values.price),
        description: values.description,
        coverUrl: book.coverUrl,
        active: book.active,
      };
      await adminService.updateBook(id, data);
      alert("Cập nhật thành công!");
      navigate('/admin/books');
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!book) return <p>Đang tải dữ liệu sách...</p>;

  return (
    <section className="narrow">
      <h1>Sửa thông tin sách</h1>
      <form className="form" onSubmit={handleSave}>
        <Input name="title" label="Tên sách" defaultValue={book.title} />
        <Input name="author" label="Tác giả" defaultValue={book.author} />
        <Input name="price" label="Giá" defaultValue={book.price} type="number" />
        <Input name="originalPrice" label="Giá gốc" defaultValue={book.originalPrice || book.price} type="number" />
        <input type="hidden" name="categoryId" value={book.categoryId || book.category?.id} />
        <Input name="stock" label="Kho" defaultValue={book.stock} type="number" />
        <Textarea name="description" label="Mô tả" defaultValue={book.description} />
        <Button type="submit" loading={loading}>Lưu thay đổi</Button>
      </form>
    </section>
  );
}
