import { useEffect, useState } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
import AdminPageHeader from '../../components/ui/AdminPageHeader';
import AdminToolbar, { AdminFilterField } from '../../components/ui/AdminToolbar';
import { adminService } from '../../services/adminService';
import { ErrorState, LoadingState } from '../../components/ui/State';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 10;

  const fetchCategories = () => {
    setLoading(true);
    setError('');
    adminService.getCategories()
      .then((res) => {
        const list = res.data?.items || res.items || (Array.isArray(res) ? res : []);
        setCategories(list);
        setCurrentPage(0);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        setError('Không thể tải danh mục.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(fetchCategories);
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    try {
      const slug = newCatName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      await adminService.addCategory({
        name: newCatName,
        slug: slug,
        active: true
      });

      alert('Tạo danh mục thành công.');
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      alert('Không thể tạo danh mục: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const paginatedCategories = categories.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(categories.length / PAGE_SIZE) || 1;

  return (
    <section className="stack">
      <AdminPageHeader title="Quản lý danh mục" />

      <form onSubmit={handleAddCategory}>
        <AdminToolbar
          end={(
            <Button type="submit" variant="primary" loading={submitting}>
              Thêm
            </Button>
          )}
        >
          <AdminFilterField label="Tên danh mục mới" className="admin-filter-field-grow">
            <input
              type="text"
              placeholder="Nhập tên danh mục"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
          </AdminFilterField>
        </AdminToolbar>
      </form>

      {loading ? (
        <LoadingState text="Đang tải danh mục..." />
      ) : error ? (
        <ErrorState text={error}>
          <Button onClick={fetchCategories}>Thử lại</Button>
        </ErrorState>
      ) : (
        <>
          <Table
            emptyText="Không tìm thấy danh mục nào."
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'name', label: 'Tên danh mục' },
              { key: 'slug', label: 'Đường dẫn' },
            ]}
            rows={paginatedCategories}
          />
          {categories.length > 0 && (
            <AdminPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </section>
  );
}
