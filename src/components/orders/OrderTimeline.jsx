import OrderStatusBadge from './OrderStatusBadge';

export default function OrderTimeline({ history }) {
  return (
    <ol className="timeline">
      {history.map((entry) => (
        <li key={entry.id}>
          <OrderStatusBadge status={entry.toStatus} />
          <span>{entry.note}</span>
        </li>
      ))}
    </ol>
  );
}
