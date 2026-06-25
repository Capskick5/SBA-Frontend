import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { authService } from '../../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const login = async (event) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get('email');
    await authService.login({ email });
    navigate(redirect);
  };

  return (
    <section className="narrow">
      <h1>Login</h1>
      <form className="form" onSubmit={login}>
        <Input label="Email" name="email" defaultValue="customer@bookverse.local" />
        <Input label="Password" name="password" type="password" defaultValue="password" />
        <Button type="submit">Login mock</Button>
      </form>
    </section>
  );
}
