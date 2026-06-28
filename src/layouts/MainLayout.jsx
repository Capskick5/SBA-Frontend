import Navbar from './Navbar';
import AiChatbot from '../components/ui/AiChatbot';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
      <footer className="footer">
        <div>&copy; {new Date().getFullYear()} BookVerse. All rights reserved.</div>
      </footer>
      <AiChatbot />
    </>
  );
}

