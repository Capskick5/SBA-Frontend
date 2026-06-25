import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function Navbar() {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await authService.logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/">BookVerse</Link>
      <input className="nav-search" placeholder="Search books..." readOnly />
      <nav className="nav-links">
        <NavLink to="/cart">Cart</NavLink>
        {user && <NavLink to="/orders">Orders</NavLink>}
        {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <>
            <NavLink to="/profile">{user.fullName}</NavLink>
            <button type="button" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
