import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPasswordPage() {
  return (
    <section className="narrow">
      <h1>Forgot Password</h1>
      <form className="form">
        <Input label="Email" />
        <Button type="button">Send OTP mock</Button>
      </form>
    </section>
  );
}
