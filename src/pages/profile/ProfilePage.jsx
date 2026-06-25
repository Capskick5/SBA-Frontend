import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';

export default function ProfilePage() {
  const user = authService.getCurrentUser();
  return (
    <section className="narrow">
      <h1>Profile</h1>
      <form className="form">
        <Input label="Full name" defaultValue={user?.fullName || ''} />
        <Input label="Email" defaultValue={user?.email || ''} disabled />
        <Button type="button">Save mock</Button>
      </form>
    </section>
  );
}
