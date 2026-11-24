import "../globals.css";

export default function SiteLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav className="nav" aria-label="Main">
            <span className="brand">Acme</span>
            <a href="/">Home</a>
            <a href="/pricing">Pricing</a>
            <a href="/contact">Contact</a>
            <a href="/newsletter">Newsletter</a>
            <a href="/about">About</a>
            {/* PLANTED: dead navigation link, /careers does not exist */}
            <a href="/careers">Careers</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
