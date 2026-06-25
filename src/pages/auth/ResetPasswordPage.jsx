import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ResetPasswordPage() {
  return (
    <section className="narrow">
      <h1>Reset Password</h1>
      <form className="form">
        <Input label="Email" />
        <Input label="OTP" />
        <Input label="New password" type="password" />
        <Button type="button">Reset mock</Button>
      </form>
    </section>
  );
}
