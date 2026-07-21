export default function Modal({ title, children, onClose, hideClose, maxWidth, isOpen = true }) {
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!hideClose && onClose) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div 
        className="modal" 
        style={maxWidth ? { maxWidth } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
