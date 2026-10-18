import { Link } from 'react-router-dom';
import { LogoMark } from '@/components/brand/Logo';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <LogoMark size={36} className="text-ink" />
      <p className="mt-5 font-mono text-[12px] text-faint">404</p>
      <h1 className="mt-2 text-h2 tracking-[-0.02em] text-ink">This page does not exist</h1>
      <p className="mt-2 max-w-[46ch] text-small text-muted">
        The address may be mistyped, or the page may have moved.
      </p>
      <Link to="/" className="mt-5 text-small text-accent-text underline underline-offset-4">
        Back to the home page
      </Link>
    </div>
  );
}
