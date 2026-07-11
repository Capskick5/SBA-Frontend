import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import Button from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/ui/State';

export default function AdminInventoryPage() {
  const getQuantity = (mov) => {
    return mov.delta ?? mov.quantityDelta ?? mov.change ?? mov.quantity ?? mov.amount ?? mov.quantityChange ?? 0;
  };

  const formatReason = (reason) => {
    if (!reason) return 'Unknown';
    return reason
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const [movements, setMovements] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const fetchMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const [movementsRes, usersRes] = await Promise.all([
          adminService.getStockMovements({ page: 0, size: 100, sort: 'createdAt,desc' }),
          adminService.getUsers({ limit: 1000 })
        ]);

        if (!active) return;

        const data = movementsRes.data?.items || movementsRes.data || [];
        const sortedMovements = Array.isArray(data)
          ? [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];
        setMovements(sortedMovements);

        const usersList = usersRes.data?.items || usersRes.data || [];
        const map = {};
        if (Array.isArray(usersList)) {
          usersList.forEach(u => {
            map[u.id] = u.name || u.email || `User ${u.id}`;
          });
        }
        setUsersMap(map);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load stock movements', err);
        setError(err.response?.data?.message || err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchMovements();
    return () => { active = false; };
  }, [reloadKey]);

  if (loading) return <LoadingState text="Loading inventory logs..." />;
  if (error) {
    return (
      <ErrorState text={`Could not load inventory logs. ${error}`}>
        <Button type="button" onClick={() => setReloadKey((value) => value + 1)}>Try again</Button>
      </ErrorState>
    );
  }

  const filteredMovements = movements.filter((mov) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();

    const bookTitle = (mov.book?.title || '').toLowerCase();
    const bookId = String(mov.bookId || '');
    const note = (mov.note || '').toLowerCase();
    const reason = (mov.reason || '').toLowerCase();
    const orderId = String(mov.orderId || '');
    const creator = (mov.createdByName || usersMap[mov.createdBy] || String(mov.createdBy) || '').toLowerCase();
    const quantity = String(getQuantity(mov));

    return bookTitle.includes(lowerQuery) ||
      bookId.includes(lowerQuery) ||
      note.includes(lowerQuery) ||
      reason.includes(lowerQuery) ||
      orderId.includes(lowerQuery) ||
      creator.includes(lowerQuery) ||
      quantity.includes(lowerQuery);
  });

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <h1>Inventory Management</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>Global log of all book stock movements.</p>
        </div>
        <div style={{ width: '300px' }}>
          <input
            type="text"
            placeholder="Search logs (book, note, user...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <p>No stock movement logs found.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Book ID</th>
              <th>Reason</th>
              <th>Order ID</th>
              <th>Quantity Change</th>
              <th>Note</th>
              <th>Created By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No matches found for "{searchQuery}"</td></tr>
            ) : (
              filteredMovements.map((mov) => (
                <tr key={mov.id}>
                  <td>{mov.id}</td>
                  <td>{mov.bookId}</td>
                  <td><span className={`inventory-reason inventory-reason-${(mov.reason || 'unknown').toLowerCase()}`}>{formatReason(mov.reason)}</span></td>
                  <td>
                    {mov.orderId
                      ? <Link className="inventory-order-link" to={`/admin/orders/${mov.orderId}`}>#{mov.orderId}</Link>
                      : <span className="muted">Manual</span>}
                  </td>
                  <td>
                    {(() => {
                      const q = getQuantity(mov);
                      return (
                        <span className={`inventory-delta ${q > 0 ? 'inventory-delta-positive' : q < 0 ? 'inventory-delta-negative' : ''}`}>
                          {q > 0 ? `+${q}` : q}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{mov.note}</td>
                  <td>{mov.createdByName || usersMap[mov.createdBy] || mov.createdBy || 'System'}</td>
                  <td>{new Date(mov.createdAt).toLocaleString('en-GB')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
