import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10 font-mono text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link to="/" className="font-bold text-foreground transition hover:opacity-80">
            ship<span className="text-primary">check</span>
          </Link>
          <span>·</span>
          <span>check before you ship</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/about" className="transition hover:text-foreground">
            what we check
          </Link>
          <Link to="/report/sample" className="transition hover:text-foreground">
            sample report
          </Link>
          <Link to="/privacy" className="transition hover:text-foreground">
            privacy
          </Link>
          <Link to="/terms" className="transition hover:text-foreground">
            terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
