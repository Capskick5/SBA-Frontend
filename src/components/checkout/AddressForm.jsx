import Input from '../ui/Input';
import Button from '../ui/Button';

export default function AddressForm({ onSubmit }) {
  return (
    <form className="form" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}>
      <Input label="Recipient" defaultValue="Nguyen Van A" required />
      <Input label="Phone" defaultValue="0900000000" required />
      <Input label="Line" defaultValue="123 Nguyen Trai" required />
      <Input label="Ward" defaultValue="Ben Thanh" />
      <Input label="District" defaultValue="Quan 1" />
      <Input label="City" defaultValue="Ho Chi Minh" required />
      <label className="check"><input type="checkbox" /> Set default</label>
      <Button type="submit">Save address</Button>
    </form>
  );
}
