import { Link } from "react-router-dom";

interface LegalFooterProps {
  className?: string;
}

export const LegalFooter = ({ className = "" }: LegalFooterProps) => {
  return (
    <footer className={`py-6 px-4 border-t border-border bg-background ${className}`}>
      <div className="max-w-[1800px] mx-auto flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">
          © 2026 OpsManagerPro
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">
            About
          </Link>
          <span>·</span>
          <Link to="/legal/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link to="/legal/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/legal/acceptable-use" className="hover:text-foreground transition-colors">
            Acceptable Use
          </Link>
          <span>·</span>
          <Link to="/legal/cookies" className="hover:text-foreground transition-colors">
            Cookies
          </Link>
          <span>·</span>
          <Link to="/legal/security" className="hover:text-foreground transition-colors">
            Security
          </Link>
          <span>·</span>
          <Link to="/legal/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <span>·</span>
          <Link to="/help" className="hover:text-foreground transition-colors">
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
};
