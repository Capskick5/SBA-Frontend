import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AddressForm from '../../components/checkout/AddressForm';
import Button from '../../components/ui/Button';
import { AuthFormMessage } from '../../components/auth/AuthFormFooter';
import { captureFormError } from '../../utils/formErrorUtils';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/State';
import { addressService } from '../../services/addressService';

const emptyValues = {
  recipient: '',
  phone: '',
  line: '',
  ward: '',
  district: '',
  city: '',
  isDefault: false,
};

function getSafeRedirect(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export default function AddressesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [formValues, setFormValues] = useState(emptyValues);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const loadAddresses = () => {
    setLoading(true);
    setError(null);
    return addressService.list()
      .then(setAddresses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    addressService.list()
      .then(setAddresses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const clearFormErrors = () => {
    setFormError(null);
    setFormFieldErrors({});
  };

  const resetForm = () => {
    setEditingId(null);
    setFormValues(emptyValues);
    setFormKey((k) => k + 1);
    clearFormErrors();
  };

  const startEdit = (address) => {
    setEditingId(address.id);
    setFormValues({
      recipient: address.recipient,
      phone: address.phone,
      line: address.line,
      ward: address.ward || '',
      district: address.district || '',
      city: address.city,
      isDefault: address.isDefault,
    });
    setFormKey((k) => k + 1);
    clearFormErrors();
  };

  const handleSubmit = async (payload) => {
    setFormLoading(true);
    clearFormErrors();
    try {
      if (editingId) {
        await addressService.update(editingId, payload);
      } else {
        await addressService.create(payload);
      }
      await loadAddresses();
      resetForm();
      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err) {
      captureFormError(err, setFormError, setFormFieldErrors);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setFormLoading(true);
    try {
      await addressService.remove(id);
      if (editingId === id) resetForm();
      await loadAddresses();
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    setFormLoading(true);
    try {
      await addressService.setDefault(id);
      await loadAddresses();
      if (redirectTo) {
        navigate(redirectTo);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <section className="stack">
      <h1>Addresses</h1>
      {redirectTo && (
        <Link to={redirectTo} className="btn btn-secondary addresses-back-link">
          Back to book
        </Link>
      )}
      {error && <ErrorState text={error} />}
      {!addresses.length && !error && <EmptyState text="No addresses yet." />}
      {addresses.map((address) => (
        <div className="panel" key={address.id}>
          <strong>{address.recipient}</strong>
          <p>{address.phone}</p>
          <p>{address.line}, {address.city}</p>
          {address.isDefault && <span className="badge">Default</span>}
          <div className="address-actions">
            <Button type="button" onClick={() => startEdit(address)}>Edit</Button>
            <Button type="button" onClick={() => handleDelete(address.id)}>Delete</Button>
            {!address.isDefault && (
              <Button type="button" onClick={() => handleSetDefault(address.id)}>Set default</Button>
            )}
          </div>
        </div>
      ))}
      <div className="panel">
        <h3>{editingId ? 'Edit address' : 'Add address'}</h3>
        <AuthFormMessage error={formError} />
        <AddressForm
          key={formKey}
          initialValues={formValues}
          fieldErrors={formFieldErrors}
          onSubmit={handleSubmit}
          submitLabel="Save"
          loading={formLoading}
          onCancel={editingId ? resetForm : undefined}
        />
      </div>
    </section>
  );
}
