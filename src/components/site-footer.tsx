import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div><Link className="footer-brand" href="/">G9 Film Lab</Link><p>Thoughtful JPEG recipes for the original Lumix G9.</p></div>
        <div className="footer-links"><Link href="/guide">Camera guide</Link><Link href="/recipes">Recipe library</Link><Link href="/studio">Recipe Studio</Link></div>
        <p className="footer-note">Independent project. Not affiliated with Panasonic or film manufacturers. Film names describe aesthetic inspiration only.</p>
      </div>
    </footer>
  );
}
