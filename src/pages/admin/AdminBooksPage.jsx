import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminBooksPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // State quản lý tiêu chí sắp xếp (Mặc định: ID giảm dần - Mới nhất lên đầu)
  const [sortBy, setSortBy] = useState('id,desc');

  // Hàm loadBooks nhận tham số sort và page
  const loadBooks = (pageIndex, currentSort) => {
    setLoading(true);

    adminService.getBooks({ page: pageIndex, sort: currentSort })
      .then((res) => {
        const responseData = res.data || res;
        const bookList = responseData.data?.items || responseData.items || [];
        setBooks(bookList);

        const total = responseData.data?.totalPages || responseData.totalPages || 1;
        setTotalPages(total);
      })
      .catch((err) => {
        console.error("Lỗi lấy danh sách sách:", err);
      })
      .finally(() => setLoading(false));
  };

  // Tự động gọi lại API khi đổi trang hoặc đổi tiêu chí sắp xếp
  useEffect(() => {
    loadBooks(currentPage, sortBy);
  }, [currentPage, sortBy]);

  const handleToggleActive = async (bookId) => {
    try {
      await adminService.toggleBookActive(bookId);
      loadBooks(currentPage, sortBy);
    } catch (err) {
      alert("Không thể cập nhật trạng thái sản phẩm: " + err.message);
    }
  };

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Quản lý kho sách</h1>

        {/* Khu vực công cụ (Bộ lọc + Nút Thêm mới) */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label htmlFor="sortSelect" style={{ marginRight: '8px', fontWeight: 'bold' }}>Sắp xếp:</label>
            <select
              id="sortSelect"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(0); // Quay về trang đầu khi đổi bộ lọc
              }}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="id,desc">ID: Mới nhất</option>
              <option value="id,asc">ID: Cũ nhất</option>
              <option value="price,asc">Giá: Thấp đến cao</option>
              <option value="price,desc">Giá: Cao xuống thấp</option>
              <option value="soldCount,desc">Bán chạy nhất</option>
            </select>
          </div>

          {/* Dùng sự kiện onClick kết hợp với navigate để chuyển trang hợp lệ */}
          <Button
            variant="primary"
            onClick={() => navigate('/admin/books/new')}
          >
            + Thêm sách mới
          </Button>
        </div>
      </div>

      {/* PHẦN HIỂN THỊ DỮ LIỆU BỊ THIẾU */}
      {loading ? (
        <p>Đang tải danh sách sách từ hệ thống...</p>
      ) : (
        <>
          <Table
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'title', label: 'Tên sách' },
              { key: 'author', label: 'Tác giả' },
              {
                key: 'category',
                label: 'Danh mục',
                render: (row) => row.category?.name || <em style={{ color: '#999' }}>Chưa phân loại</em>
              },
              {
                key: 'price',
                label: 'Giá bán',
                render: (row) => formatCurrency(row.price)
              },
              { key: 'stock', label: 'Kho còn' },
              {
                key: 'active',
                label: 'Trạng thái',
                render: (row) => (
                  <span style={{ color: row.active ? 'green' : 'red', fontWeight: 'bold' }}>
                    {row.active ? 'Đang bán' : 'Đã ẩn'}
                  </span>
                )
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to={`/admin/books/${row.id}`} className="btn-link">Sửa</Link>
                    <button
                      onClick={() => handleToggleActive(row.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: row.active ? '#e53e3e' : '#3182ce',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline'
                      }}
                    >
                      {row.active ? 'Ẩn sách' : 'Hiện sách'}
                    </button>
                  </div>
                )
              },
            ]}
            rows={books}
          />

          {/* Bộ điều khiển lật trang */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
            <Button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              &laquo; Trang trước
            </Button>

            <span style={{ fontWeight: 'bold' }}>
              Trang {currentPage + 1} / {totalPages}
            </span>

            <Button
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Trang sau &raquo;
            </Button>
          </div>
        </>
      )}
    </section>
  );
}