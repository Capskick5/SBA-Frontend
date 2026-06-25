import { useEffect, useState } from 'react';
import AddressForm from '../../components/checkout/AddressForm';
import { checkoutService } from '../../services/checkoutService';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  useEffect(() => { checkoutService.getAddresses().then(setAddresses); }, []);
  return (
    <section className="stack">
      <h1>Addresses</h1>
      {addresses.map((address) => (
        <div className="panel" key={address.id}>
          <strong>{address.recipient}</strong>
          <p>{address.phone}</p>
          <p>{address.line}, {address.city}</p>
          {address.isDefault && <span className="badge">Default</span>}
        </div>
      ))}
      <AddressForm />
    </section>
  );
}
