import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [ragLimit, setRagLimit] = useState(10);
  const [isIngesting, setIsIngesting] = useState(false);
  const [currentBook, setCurrentBook] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [logMessages, setLogMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    adminService.getStats().then(setStats);
  }, []);

  if (!stats) return <p>Loading dashboard...</p>;

  return (
    <section className="stack">
      <h1>Admin Dashboard</h1>
      <div className="stats-grid">
        <div className="panel"><strong>Users</strong><p>{stats.totalUsers}</p></div>
        <div className="panel"><strong>Books</strong><p>{stats.totalBooks}</p></div>
        <div className="panel"><strong>Orders</strong><p>{stats.totalOrders}</p></div>
        <div className="panel"><strong>Revenue</strong><p>{formatCurrency(stats.recognizedRevenue)}</p></div>
      </div>

      <div className="panel" style={{ marginTop: '24px' }}>
        <h2>Quản lý RAG Catalog</h2>
        <p className="muted">Cập nhật dữ liệu sách vào Vector Database để phục vụ tìm kiếm và đề xuất ngữ nghĩa.</p>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: '20px 0' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Giới hạn số lượng sách Ingest (Tối đa 10):</label>
            <input
              type="number"
              min="1"
              max="10"
              value={ragLimit}
              onChange={(e) => setRagLimit(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
              disabled={isIngesting}
              style={{ padding: '8px', width: '100px', border: '1px solid #bbb' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleRagIngest(false)}
              disabled={isIngesting}
            >
              Ingest Catalog
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => handleRagIngest(true)}
              disabled={isIngesting}
            >
              Force Ingest Content & Catalog
            </button>
          </div>
        </div>

        {errorMessage && <p className="form-error">{errorMessage}</p>}

        {(isIngesting || totalCount > 0) && (
          <div style={{ margin: '20px 0', padding: '16px', border: '1px solid #ddd', background: '#fcfcfc' }}>
            <div style={{ display: 'flex', justifyContent: 'between', marginBottom: '8px' }}>
              <strong>Tiến độ: {completedCount} / {totalCount} ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)</strong>
              {currentBook && <span style={{ marginLeft: 'auto', color: '#555' }}>Đang xử lý: <em>{currentBook}</em></span>}
            </div>
            
            <div style={{ width: '100%', height: '12px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
              <div
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  height: '100%',
                  background: '#111',
                  transition: 'width 0.3s ease'
                }}
              ></div>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', background: '#fff', border: '1px solid #ddd', padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
              {logMessages.map((msg, idx) => (
                <div key={idx} style={{ whiteSpace: 'pre-wrap', marginBottom: '4px' }}>{msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
