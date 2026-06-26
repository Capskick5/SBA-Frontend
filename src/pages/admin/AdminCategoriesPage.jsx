import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Gọi API danh mục thực tế
    adminService.getCategories().then((data) => {
      // Backend thường trả về danh sách trực tiếp hoặc trong trường 'content'
      setCategories(Array.isArray(data) ? data : (data.content || []));
    });
  }, []);

  return (
    <section className="stack">
      <h1>Quản lý Danh mục</h1>
      <Link to="/admin/categories/new">Thêm danh mục mới</Link>
      <Table
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Tên danh mục' },
          { key: 'action', label: 'Thao tác', render: (row) => <Link to={`/admin/categories/${row.id}`}>Sửa</Link> }
        ]}
        rows={categories}
      />
    </section>
  );
}