import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function VerifyEmailPage() {
  return (
    <section className="narrow">
      <h1>Verify Email</h1>
      <form className="form">
        <Input label="Email" />
        <Input label="OTP" />
        <Button type="button">Verify mock</Button>
      </form>
    </section>
  );
}
