import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

export default function AdminRagPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [ragStatuses, setRagStatuses] = useState({});
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  
  const [actionLoading, setActionLoading] = useState({});
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const fetchRagStatuses = (bookList) => {
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
                ...prev[book.id],
                loading: false,
                status: data.status || 'NOT_INDEXED',
                chunkCount: data.chunk_count || data.chunkCount || 0,
                updatedAt: data.updated_at || data.updatedAt,
                error: data.error
              }
            }));
          })
          .catch(() => {
            setRagStatuses(prev => ({
              ...prev,
              [book.id]: {
                ...prev[book.id],
                loading: false,
                status: 'NOT_INDEXED',
                chunkCount: 0
              }
            }));
          });
      } else {
        setRagStatuses(prev => ({
          ...prev,
          [book.id]: {
            ...prev[book.id],
            loading: false,
            status: 'NO_FILE',
            chunkCount: 0
          }
        }));
      }

      adminService.getBookCatalogStatus(book.id)
        .then((res) => {
          const data = res.data || res;
          setRagStatuses(prev => ({
            ...prev,
            [book.id]: {
              ...prev[book.id],
              catalogLoading: false,
              catalogStatus: data.status || 'not_found'
            }
          }));
        })
        .catch(() => {
          setRagStatuses(prev => ({
            ...prev,
            [book.id]: {
              ...prev[book.id],
              catalogLoading: false,
              catalogStatus: 'not_found'
            }
          }));
        });
    });
  };

  useEffect(() => {
    loadHealth();
    loadBooks(currentPage, searchQuery);
  }, [currentPage, loadBooks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(0);
    loadBooks(0, searchQuery);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const ingestableBooks = books.filter(b => b.fileKey);
    if (selectedIds.length === ingestableBooks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ingestableBooks.map(b => b.id));
    }
  };

  const handleSingleIngest = async (bookId) => {
    setActionLoading(prev => ({ ...prev, [bookId]: 'ingest' }));
    setMessage({ type: '', text: '' });
    try {
      await adminService.ingestBookContent(bookId);
      setMessage({ type: 'success', text: 'Ingested book successfully.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to ingest book: ' + (err.response?.data?.message || err.message)
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
      setMessage({ type: 'success', text: 'Catalog synced successfully.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to sync catalog: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }));
    }
  };

  const handleDeleteIndex = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this RAG index?')) return;
    setActionLoading(prev => ({ ...prev, [bookId]: 'delete' }));
    setMessage({ type: '', text: '' });
    try {
      await adminService.deleteBookIndex(bookId);
      setMessage({ type: 'success', text: 'Deleted RAG index successfully.' });
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to delete index: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [bookId]: null }));
    }
  };

  const handleBulkIngest = async () => {
    if (selectedIds.length === 0) return;
    setBulkProcessing(true);
    setMessage({ type: '', text: '' });
    try {
      await adminService.ingestBooksBulk(selectedIds);
      setMessage({ type: 'success', text: `Successfully processed bulk ingestion for ${selectedIds.length} books.` });
      setSelectedIds([]);
      loadBooks(currentPage, searchQuery);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Bulk ingestion failed: ' + (err.response?.data?.message || err.message)
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const renderStatus = (row) => {
    if (!row.fileKey) {
      return <span style={{ color: '#888', fontWeight: 'bold' }}>No PDF/EPUB File</span>;
    }
    const info = ragStatuses[row.id];
    if (!info) {
      return <span className="muted">Checking...</span>;
    }
    if (info.loading) {
      return <span className="muted">Loading RAG Info...</span>;
    }
    if (info.status?.toLowerCase() === 'indexed' || info.chunkCount > 0) {
      return (
        <div>
          <span style={{ color: 'green', fontWeight: 'bold' }}>Indexed</span>
          <div style={{ fontSize: '12px', color: '#555' }}>
            Chunks: <strong>{info.chunkCount}</strong>
          </div>
        </div>
      );
    }
    return <span style={{ color: '#c00' }}>Not Indexed</span>;
  };

  const renderCatalogStatus = (row) => {
    const info = ragStatuses[row.id];
    if (!info) {
      return <span className="muted">Checking...</span>;
    }
    if (info.catalogLoading) {
      return <span className="muted">Loading...</span>;
    }
    if (info.catalogStatus?.toLowerCase() === 'indexed') {
      return <span style={{ color: 'green', fontWeight: 'bold' }}>Synced</span>;
    }
    return <span style={{ color: '#c00' }}>Not Synced</span>;
  };

  const renderHealth = () => {
    if (healthLoading) {
      return <span className="muted">Checking health...</span>;
    }
    if (!health || health.status !== 'ok') {
      return (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#d9534f' }}></span>
          <strong style={{ color: '#d9534f' }}>Offline (Cannot connect to Port 8000)</strong>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: '#5cb85c' }}></span>
          <strong style={{ color: '#5cb85c' }}>Online</strong>
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Database: MongoDB: {health.mongo} | Qdrant: {health.qdrant} | MinIO: {health.minio || 'ok'}
        </div>
      </div>
    );
  };

  const isIngestable = books.filter(b => b.fileKey).length > 0;

  return (
    <section className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>RAG Catalog Management</h1>
          <p className="muted">Index book PDF/EPUB content and metadata to serve AI Search and Chat services.</p>
        </div>
        <div className="panel" style={{ padding: '12px 20px', margin: 0 }}>
          <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', textTransform: 'uppercase', color: '#666' }}>RAG Service Status</strong>
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

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search books by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
          <Button type="submit">Search</Button>
        </form>

        <Button
          onClick={handleBulkIngest}
          disabled={selectedIds.length === 0 || bulkProcessing}
          variant="primary"
        >
          {bulkProcessing ? 'Ingesting Selected...' : `Ingest Selected (${selectedIds.length})`}
        </Button>
      </div>

      {loading ? (
        <p>Loading books list...</p>
      ) : (
        <>
          <Table
            columns={[
              {
                key: 'select',
                label: (
                  <input
                    type="checkbox"
                    checked={isIngestable && selectedIds.length === books.filter(b => b.fileKey).length}
                    onChange={toggleSelectAll}
                    disabled={!isIngestable}
                  />
                ),
                render: (row) => (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    disabled={!row.fileKey}
                  />
                )
              },
              {
                key: 'coverUrl',
                label: 'Cover',
                render: (row) => (
                  row.coverUrl ? (
                    <img src={row.coverUrl} alt={row.title} style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                  ) : (
                    <div style={{ width: '40px', height: '60px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>No Cover</div>
                  )
                )
              },
              {
                key: 'details',
                label: 'Book Details',
                render: (row) => (
                  <div>
                    <strong style={{ fontSize: '15px' }}>{row.title}</strong>
                    <div style={{ fontSize: '13px', color: '#666' }}>Author: {row.author}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>Publisher: {row.publisher || 'N/A'} ({row.publicationYear || 'N/A'})</div>
                  </div>
                )
              },
              {
                key: 'category',
                label: 'Category',
                render: (row) => row.category?.name || 'N/A'
              },
              {
                key: 'status',
                label: 'Content Index',
                render: (row) => renderStatus(row)
              },
              {
                key: 'catalogStatus',
                label: 'Catalog Status',
                render: (row) => renderCatalogStatus(row)
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => {
                  const state = actionLoading[row.id];
                  const info = ragStatuses[row.id];
                  const hasIndex = info && (info.status?.toLowerCase() === 'indexed' || info.chunkCount > 0);
                  
                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        onClick={() => handleSingleIngest(row.id)}
                        disabled={!!state || !row.fileKey}
                        size="sm"
                      >
                        {state === 'ingest' ? 'Ingesting...' : 'Ingest'}
                      </Button>
                      
                      <Button
                        onClick={() => handleSyncCatalog(row.id)}
                        disabled={!!state || !row.fileKey}
                        size="sm"
                      >
                        {state === 'catalog' ? 'Syncing...' : 'Sync Catalog'}
                      </Button>
                      
                      {hasIndex && (
                        <Button
                          onClick={() => handleDeleteIndex(row.id)}
                          disabled={!!state}
                          size="sm"
                          style={{ background: '#d9534f', color: 'white' }}
                        >
                          {state === 'delete' ? 'Deleting...' : 'Delete Index'}
                        </Button>
                      )}
                    </div>
                  );
                }
              }
            ]}
            rows={books}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <span className="muted">
              Page {currentPage + 1} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >
                Previous
              </Button>
              <Button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
