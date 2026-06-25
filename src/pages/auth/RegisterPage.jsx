import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function RegisterPage() {
  return (
    <section className="narrow">
      <h1>Register</h1>
      <form className="form">
        <Input label="Full name" />
        <Input label="Email" />
        <Input label="Password" type="password" />
        <Button type="button">Create account mock</Button>
      </form>
    </section>
  );
}
