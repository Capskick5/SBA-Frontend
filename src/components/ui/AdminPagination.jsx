import Button from './Button';

/**
 * Admin pagination matching /admin/books.
 * `page` is 0-based.
 */
export default function AdminPagination({ page, totalPages, onPageChange }) {
  const safeTotal = Math.max(totalPages || 0, 1);

  return (
    <nav className="admin-pagination" aria-label="Phan trang admin">
      <Button
        type="button"
        variant="secondary"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        {'\u00AB Tr\u01B0\u1EDBc'}
      </Button>
      <span className="admin-pagination-label">
        Trang {page + 1} / {safeTotal}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={page >= safeTotal - 1}
        onClick={() => onPageChange(page + 1)}
      >
        {'Sau \u00BB'}
      </Button>
    </nav>
  );
}
