import { EmptyState } from './State';

export default function Table({ columns, rows, emptyText }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  if (!safeRows.length && emptyText) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
