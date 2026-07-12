import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import AddressForm from '../../components/checkout/AddressForm';
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

export default function AddressesPage({ onTitleChange }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const redirectLabel = redirectTo?.startsWith('/cart')
    ? 'Back to cart'
    : redirectTo?.startsWith('/checkout')
      ? 'Back to checkout'
      : 'Back';
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [formValues, setFormValues] = useState(emptyValues);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formFieldErrors, setFormFieldErrors] = useState({});
  const [showForm, setShowForm] = useState(false);

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

  useEffect(() => {
    if (!onTitleChange) return;
    onTitleChange(showForm ? (editingId ? 'Edit address' : 'Add new address') : 'Address book');
  }, [editingId, onTitleChange, showForm]);

  const clearFormErrors = () => {
    setFormError(null);
    setFormFieldErrors({});
  };

  const resetForm = () => {
    setEditingId(null);
    setFormValues(emptyValues);
    setFormKey((k) => k + 1);
    setShowForm(false);
    clearFormErrors();
  };

  const startAdd = () => {
    setEditingId(null);
    setFormValues(emptyValues);
    setFormKey((k) => k + 1);
    setShowForm(true);
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
    setShowForm(true);
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

  if (showForm) {
    return (
      <section className="address-book-page address-book-editor-page">
        {!onTitleChange && <h1>{editingId ? 'Edit address' : 'Add new address'}</h1>}

        {redirectTo && (
          <Link to={redirectTo} className="btn btn-secondary addresses-back-link">
            {redirectLabel}
          </Link>
        )}

        <div className="address-book-side-window">
          <AuthFormMessage error={formError} />
          <AddressForm
            key={formKey}
            initialValues={formValues}
            fieldErrors={formFieldErrors}
            onSubmit={handleSubmit}
            submitLabel="Save"
            loading={formLoading}
            onCancel={resetForm}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="address-book-page">
      {!onTitleChange && <h1>Address book</h1>}
      {redirectTo && (
        <Link to={redirectTo} className="btn btn-secondary addresses-back-link">
          {redirectLabel}
        </Link>
      )}
      {error && <ErrorState text={error} />}

      <button type="button" className="address-book-add" onClick={startAdd}>
        <Plus size={26} />
        <span>Add new address</span>
      </button>

      {!addresses.length && !error && !showForm && <EmptyState text="No addresses yet." />}

      <div className="address-book-list">
        {addresses.map((address) => (
          <article className="address-book-card" key={address.id}>
            <div className="address-book-main">
              <div className="address-book-name-row">
                <strong>{address.recipient}</strong>
                {address.isDefault && (
                  <span className="address-book-default">
                    <CheckCircle2 size={14} />
                    Default address
                  </span>
                )}
              </div>
              <p>Address: {[address.line, address.ward, address.district, address.city].filter(Boolean).join(', ')}</p>
              <p>Phone: {address.phone}</p>
            </div>

            <div className="address-book-actions">
              <button type="button" onClick={() => startEdit(address)}>Edit</button>
              <button type="button" className="danger" onClick={() => handleDelete(address.id)}>Delete</button>
              {address.isDefault ? (
                <span className="address-book-action-spacer" aria-hidden="true" />
              ) : (
                <button type="button" onClick={() => handleSetDefault(address.id)}>Set default</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
