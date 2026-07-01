import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/ui/State';

export default function AdminInventoryPage() {
  const getQuantity = (mov) => {
    return mov.delta ?? mov.quantityDelta ?? mov.change ?? mov.quantity ?? mov.amount ?? mov.quantityChange ?? 0;
  };

  const [movements, setMovements] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    const fetchMovements = async () => {
      setLoading(true);
      try {
        const [movementsRes, usersRes] = await Promise.all([
          adminService.getStockMovements(),
          adminService.getUsers({ limit: 1000 })
        ]);

        if (!active) return;

        const data = movementsRes.data?.items || movementsRes.data || [];
        setMovements(Array.isArray(data) ? data : []);

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
  }, []);

  if (loading) return <LoadingState text="Loading inventory logs..." />;
  if (error) return <p className="error">Error: {error}</p>;

  const filteredMovements = movements.filter((mov) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();

    const bookTitle = (mov.book?.title || '').toLowerCase();
    const bookId = String(mov.bookId || '');
    const note = (mov.note || '').toLowerCase();
    const reason = (mov.reason || '').toLowerCase();
    const creator = (mov.createdByName || usersMap[mov.createdBy] || String(mov.createdBy) || '').toLowerCase();
    const quantity = String(getQuantity(mov));

    return bookTitle.includes(lowerQuery) ||
      bookId.includes(lowerQuery) ||
      note.includes(lowerQuery) ||
      reason.includes(lowerQuery) ||
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
              <th>Quantity Change</th>
              <th>Note</th>
              <th>Created By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovements.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No matches found for "{searchQuery}"</td></tr>
            ) : (
              filteredMovements.map((mov) => (
                <tr key={mov.id}>
                  <td>{mov.id}</td>
                  <td>{mov.book?.title || mov.bookId}</td>
                  <td>
                    {(() => {
                      const q = getQuantity(mov);
                      return (
                        <span style={{
                          color: q > 0 ? 'green' : (q < 0 ? 'red' : 'inherit'),
                          fontWeight: 'bold'
                        }}>
                          {q > 0 ? `+${q}` : q}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{mov.note}</td>
                  <td>{mov.createdByName || usersMap[mov.createdBy] || mov.createdBy || 'System'}</td>
                  <td>{new Date(mov.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  );
}
