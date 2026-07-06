import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea({ label, ...props }, ref) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <textarea ref={ref} {...props} />
    </label>
  );
});

export default Textarea;
