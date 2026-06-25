import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ title = 'Confirm', children, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="stack">
        <p>{children}</p>
        <div className="actions">
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}
