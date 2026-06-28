import Header from './Header';
import Footer from './Footer';
import AiChatbot from '../components/ui/AiChatbot';

export default function MainLayout({ children }) {
  return (
    <>
      <Header />
      <main className="page">{children}</main>
      <Footer />
      <AiChatbot />
    </>
  );
}

