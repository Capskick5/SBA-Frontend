import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';

const defaultValues = {
  recipient: '',
  phone: '',
  line: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

export default function AddressForm({
  initialValues = defaultValues,
  onSubmit,
  submitLabel = 'Save',
  loading = false,
  onCancel,
  fieldErrors = {},
}) {
  const [values, setValues] = useState({ ...defaultValues, ...initialValues });

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(values);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <Input
        label="Recipient"
        name="recipient"
        placeholder="Recipient name"
        value={values.recipient}
        onChange={(e) => setField('recipient', e.target.value)}
        error={fieldErrors.recipient}
        required
      />
      <Input
        label="Phone"
        name="phone"
        placeholder="Phone number"
        value={values.phone}
        onChange={(e) => setField('phone', e.target.value)}
        error={fieldErrors.phone}
        required
      />
      <Input
        label="Line"
        name="line"
        placeholder="Street address"
        value={values.line}
        onChange={(e) => setField('line', e.target.value)}
        error={fieldErrors.line}
        required
      />
      <Input
        label="Ward"
        name="ward"
        placeholder="Ward"
        value={values.ward}
        onChange={(e) => setField('ward', e.target.value)}
      />
      <Input
        label="District"
        name="district"
        placeholder="District"
        value={values.district}
        onChange={(e) => setField('district', e.target.value)}
      />
      <Input
        label="City"
        name="city"
        placeholder="City"
        value={values.city}
        onChange={(e) => setField('city', e.target.value)}
        error={fieldErrors.city}
        required
      />
      <label className="check">
        <input
          type="checkbox"
          checked={values.isDefault}
          onChange={(e) => setField('isDefault', e.target.checked)}
        />
        Set default
      </label>
      <div className="actions">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}
