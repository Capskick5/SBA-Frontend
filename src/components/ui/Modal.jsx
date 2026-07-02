export default function Modal({ title, children, onClose, hideClose }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          {!hideClose && <button type="button" onClick={onClose}>Close</button>}
        </div>
        {children}
      </div>
    </div>
  );
}
