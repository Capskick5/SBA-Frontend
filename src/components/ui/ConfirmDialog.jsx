import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ title = 'Confirm', children, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel} hideClose>
      <div className="stack">
        <p>{children}</p>
        <div className="confirm-dialog-actions">
          <Button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
