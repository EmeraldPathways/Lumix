import Link from "next/link";
import { Aperture, BookOpenText, Camera, CircleUserRound, Compass, GitCompareArrows, SlidersHorizontal } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/recipes", label: "Discover", icon: Compass },
  { href: "/recipes", label: "Recipes", icon: BookOpenText },
  { href: "/studio", label: "Studio", icon: SlidersHorizontal },
  { href: "/my-recipes", label: "My Recipes", icon: CircleUserRound },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/guide", label: "G9 Guide", icon: Camera },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="G9 Film Lab home">
          <span className="brand-mark"><Aperture size={21} strokeWidth={1.7} /></span>
          <span className="brand-copy"><span>G9 Film Lab</span><small>JPEGS, with feeling.</small></span>
        </Link>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navItems.map(({ href, label }) => <Link key={label} href={href}>{label}</Link>)}
        </nav>
        <Link className="header-cta" href="/studio"><span>Make a recipe</span><span aria-hidden="true">↗</span></Link>
        <ThemeToggle />
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={label} href={href}><Icon aria-hidden="true" size={16} /><span>{label}</span></Link>
        ))}
      </nav>
    </header>
  );
}
