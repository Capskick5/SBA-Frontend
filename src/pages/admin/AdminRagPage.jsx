import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import AdminPagination from '../../components/ui/AdminPagination';
import { LoadingState } from '../../components/ui/State';

export default function AdminRagPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [ragStatuses, setRagStatuses] = useState({});
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  
  const [actionLoading, setActionLoading] = useState({});
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [chunkSize, setChunkSize] = useState(500);
  const [overlapSize, setOverlapSize] = useState(100);

  const loadHealth = () => {
    setHealthLoading(true);
    adminService.checkRagHealth()
      .then((res) => {
        const body = res.data || res;
        setHealth(body);
      })
      .catch(() => {
        setHealth({ status: 'unreachable' });
      })
      .finally(() => setHealthLoading(false));
  };

  function fetchRagStatuses(bookList) {
    bookList.forEach(async (book) => {
      setRagStatuses(prev => ({
        ...prev,
        [book.id]: { loading: true, catalogLoading: true }
      }));

      if (book.fileKey) {
        adminService.getBookIndexStatus(book.id)
          .then((res) => {
            const data = res.data || res;
            setRagStatuses(prev => ({
              ...prev,
              [book.id]: {
                ...prev[book.id], loading: false, status: data.status || 'NOT_INDEXED',
                chunkCount: data.chunk_count || data.chunkCount || 0,
                updatedAt: data.updated_at || data.updatedAt, error: data.error
              }
            }));
          })
          .catch(() => setRagStatuses(prev => ({
            ...prev, [book.id]: { ...prev[book.id], loading: false, status: 'NOT_INDEXED', chunkCount: 0 }
          })));
      } else {
        setRagStatuses(prev => ({
          ...prev, [book.id]: { ...prev[book.id], loading: false, status: 'NO_FILE', chunkCount: 0 }
        }));
      }

      adminService.getBookCatalogStatus(book.id)
        .then((res) => {
          const data = res.data || res;
          setRagStatuses(prev => ({
            ...prev,
            [book.id]: { ...prev[book.id], catalogLoading: false, catalogStatus: data.status || 'not_found' }
          }));
        })
        .catch(() => setRagStatuses(prev => ({
          ...prev, [book.id]: { ...prev[book.id], catalogLoading: false, catalogStatus: 'not_found' }
        })));
    });
  }

  const loadBooks = useCallback((pageIndex, query) => {
    setLoading(true);
    const params = { page: pageIndex, size: 10, sort: 'id,desc' };
    if (query.trim()) {
      params.query = query;
    }
    
    adminService.getBooks(params)
      .then((res) => {
        const body = res.data || res;
        if (body?.data?.items && Array.isArray(body.data.items)) {
          setBooks(body.data.items);
          setTotalPages(body.data.totalPages || 1);
          fetchRagStatuses(body.data.items);
        } else if (body?.items && Array.isArray(body.items)) {
          setBooks(body.items);
          setTotalPages(body.totalPages || 1);
          fetchRagStatuses(body.items);
        } else {
          setBooks([]);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        console.error(err);
        setBooks([]);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      loadHealth();
      loadBooks(currentPage, appliedQuery);
    });
  }, [currentPage, appliedQuery, loadBooks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(0);
    setAppliedQuery(searchQuery);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === books.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(books.map(b => b.id));
    }
  };

  const handleSingleIngest = async (bookId) => {
    setActionLoading(prev => ({ ...prev, [bookId]: 'ingest' }));
    setMessage({ type: '', text: '' });
    try {
      await adminService.ingestBookContent(bookId, chunkSize, overlapSize);
      setMessage({ type: 'success', text: 'Đã lập chỉ mục sách thành công.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Không thể lập chỉ mục sách: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }));
    }
  };

  const handleSyncCatalog = async (bookId) => {
    setActionLoading(prev => ({ ...prev, [bookId]: 'catalog' }));
    setMessage({ type: '', text: '' });
    try {
      await adminService.upsertBookCatalog(bookId);
      setMessage({ type: 'success', text: 'Đồng bộ danh mục thành công.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Không thể đồng bộ danh mục: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }));
    }
  };

  const handleDeleteIndex = async (bookId) => {
    if (!window.confirm('Bạn có chắc muốn xóa chỉ mục RAG này?')) return;
    setActionLoading(prev => ({ ...prev, [bookId]: 'delete' }));
    setMessage({ type: '', text: '' });
    try {
      await adminService.deleteBookIndex(bookId);
      setMessage({ type: 'success', text: 'Đã xóa chỉ mục RAG thành công.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Không thể xóa chỉ mục: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }));
    }
  };

  const handleBulkIngest = async () => {
    if (selectedIds.length === 0) return;
    const ingestableIds = selectedIds.filter(id => {
      const book = books.find(b => b.id === id);
      return book && book.fileKey;
    });

    if (ingestableIds.length === 0) {
      setMessage({ type: 'error', text: 'Không có sách nào được chọn có tệp PDF/EPUB để lập chỉ mục.' });
      return;
    }

    setBulkProcessing(true);
    setMessage({ type: '', text: '' });
    try {
      await adminService.ingestBooksBulk(ingestableIds, chunkSize, overlapSize);
      setMessage({ type: 'success', text: `Đã xử lý lập chỉ mục hàng loạt cho ${ingestableIds.length} sách.` });
      setSelectedIds([]);
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Lập chỉ mục hàng loạt thất bại: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkSyncCatalog = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    setMessage({ type: '', text: '' });
    try {
      await adminService.upsertBooksCatalogBulk(selectedIds);
      setMessage({ type: 'success', text: `Đã đồng bộ danh mục cho ${selectedIds.length} sách.` });
      setSelectedIds([]);
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Đồng bộ danh mục hàng loạt thất bại: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bạn có chắc muốn xóa chỉ mục và siêu dữ liệu cho ${selectedIds.length} sách đã chọn?`)) {
      return;
    }
    setBulkProcessing(true);
    setMessage({ type: '', text: '' });
    try {
      await adminService.deleteBooksIndicesBulk(selectedIds);
      setMessage({ type: 'success', text: `Đã xóa chỉ mục RAG cho ${selectedIds.length} sách.` });
      setSelectedIds([]);
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Xóa hàng loạt thất bại: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const renderStatus = (row) => {
    if (!row.fileKey) {
      return <span style={{ color: '#888', fontWeight: 'bold' }}>Không có tệp PDF/EPUB</span>;
    }
    const info = ragStatuses[row.id];
    if (!info) {
      return <span className="muted">Đang kiểm tra...</span>;
    }
    if (info.loading) {
      return <span className="muted">Đang tải thông tin RAG...</span>;
    }
    if (info.status?.toLowerCase() === 'indexed' || info.chunkCount > 0) {
      return (
        <div>
          <span style={{ color: 'green', fontWeight: 'bold' }}>Đã lập chỉ mục</span>
          <div style={{ fontSize: '12px', color: '#555' }}>
            Khối: <strong>{info.chunkCount}</strong>
          </div>
        </div>
      );
    }
    return <span style={{ color: '#c00' }}>Chưa lập chỉ mục</span>;
  };

  const renderCatalogStatus = (row) => {
    const info = ragStatuses[row.id];
    if (!info) {
      return <span className="muted">Đang kiểm tra...</span>;
    }
    if (info.catalogLoading) {
      return <span className="muted">Đang tải...</span>;
    }
    if (info.catalogStatus?.toLowerCase() === 'indexed') {
      return <span style={{ color: 'green', fontWeight: 'bold' }}>Đã đồng bộ</span>;
    }
    return <span style={{ color: '#c00' }}>Chưa đồng bộ</span>;
  };

  const renderHealth = () => {
    if (healthLoading) {
      return <span className="muted">Đang kiểm tra trạng thái...</span>;
    }
    if (!health || health.status !== 'ok') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#d9534f' }}></span>
          <strong style={{ color: '#d9534f' }}>Ngoại tuyến (Không kết nối được cổng 8000)</strong>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#5cb85c' }}></span>
          <strong style={{ color: '#5cb85c' }}>Trực tuyến</strong>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Cơ sở dữ liệu: MongoDB: {health.mongo} | Qdrant: {health.qdrant} | MinIO: {health.minio || 'ok'}
        </div>
      </div>
    );
  };

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Quản lý danh mục RAG</h1>
          <p className="muted">Lập chỉ mục nội dung PDF/EPUB và siêu dữ liệu sách để phục vụ Tìm kiếm AI và Chat.</p>
        </div>
        <div className="panel" style={{ padding: '12px 20px', margin: 0 }}>
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>Trạng thái dịch vụ RAG</strong>
          {renderHealth()}
        </div>
      </div>

      {message.text && (
        <div className={`panel`} style={{
          borderLeft: `4px solid ${message.type === 'success' ? '#5cb85c' : '#d9534f'}`,
          background: message.type === 'success' ? '#f4faf4' : '#faf4f4',
          padding: '12px 16px',
          marginBottom: '20px'
        }}>
          {message.text}
        </div>
      )}

      <div className="panel" style={{
        padding: '16px 20px',
        marginBottom: '20px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: '600', color: '#334155', fontSize: '15px' }}>
          Cài đặt lập chỉ mục
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Kích thước khối:</label>
          <input
            type="number"
            value={chunkSize}
            onChange={(e) => setChunkSize(Math.max(1, parseInt(e.target.value) || 0))}
            style={{
              width: '80px',
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Kích thước chồng lấn:</label>
          <input
            type="number"
            value={overlapSize}
            onChange={(e) => setOverlapSize(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: '80px',
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề hoặc tác giả"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
          <Button type="submit">Tìm kiếm</Button>
        </form>

        <div className="admin-row-actions">
          <Button
            type="button"
            onClick={handleBulkIngest}
            disabled={selectedIds.length === 0 || bulkProcessing}
          >
            {bulkProcessing ? 'Đang lập chỉ mục...' : `Lập chỉ mục nội dung (${selectedIds.length})`}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleBulkSyncCatalog}
            disabled={selectedIds.length === 0 || bulkProcessing}
          >
            Đồng bộ danh mục ({selectedIds.length})
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="danger-action"
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0 || bulkProcessing}
          >
            Xóa ({selectedIds.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Đang tải sách..." />
      ) : (
        <>
          <Table
            emptyText="Không tìm thấy sách nào."
            columns={[
              {
                key: 'select',
                label: (
                  <input
                    type="checkbox"
                    checked={books.length > 0 && selectedIds.length === books.length}
                    onChange={toggleSelectAll}
                  />
                ),
                render: (row) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                )
              },
              {
                key: 'coverUrl',
                label: 'Bìa',
                render: (row) => (
                  row.coverUrl ? (
                    <img src={row.coverUrl} alt={row.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '60px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>Không có bìa</div>
                  )
                )
              },
              {
                key: 'details',
                label: 'Chi tiết sách',
                render: (row) => (
                  <div>
                    <strong style={{ fontSize: '15px' }}>{row.title}</strong>
                    <div style={{ fontSize: '13px', color: '#666' }}>Tác giả: {row.author}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>NXB: {row.publisher || 'N/A'} ({row.publicationYear || 'N/A'})</div>
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Danh mục',
                render: (row) => row.category?.name || 'N/A'
              },
              {
                key: 'status',
                label: 'Chỉ mục nội dung',
                render: (row) => renderStatus(row)
              },
              {
                key: 'catalogStatus',
                label: 'Trạng thái danh mục',
                render: (row) => renderCatalogStatus(row)
              },
              {
                key: 'actions',
                label: 'Thao tác',
                render: (row) => {
                  const state = actionLoading[row.id];
                  const info = ragStatuses[row.id];
                  const hasIndex = info && (info.status?.toLowerCase() === 'indexed' || info.chunkCount > 0);
                  
                  return (
                    <div className="admin-row-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSingleIngest(row.id)}
                        disabled={!!state || !row.fileKey}
                      >
                        {state === 'ingest' ? 'Đang lập chỉ mục...' : 'Lập chỉ mục'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSyncCatalog(row.id)}
                        disabled={!!state || !row.fileKey}
                      >
                        {state === 'catalog' ? 'Đang đồng bộ...' : 'Đồng bộ danh mục'}
                      </Button>
                      
                      {hasIndex && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="danger-action"
                          onClick={() => handleDeleteIndex(row.id)}
                          disabled={!!state}
                        >
                          {state === 'delete' ? 'Đang xóa...' : 'Xóa chỉ mục'}
                        </Button>
                      )}
                    </div>
                  );
                }
              }
            ]}
            rows={books}
          />

          <AdminPagination
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </section>
  );
}
