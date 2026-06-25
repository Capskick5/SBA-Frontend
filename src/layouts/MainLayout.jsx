import Navbar from './Navbar';

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
      <footer className="footer">BookVerse wireframe</footer>
    </>
  );
}
