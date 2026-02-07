import { Logo } from './Logo';

interface HeaderProps {
  logoUrl?: string;
  logoHeight?: number;
  className?: string;
}

/**
 * Header Component
 *
 * Fixed 62px height header with centered logo.
 * Used at the top of all pages for consistent branding.
 */
export function Header({ logoUrl, logoHeight, className }: HeaderProps) {
  return (
    <header
      className={className}
      style={{
        height: '62px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'white',
        borderBottom: '1px solid var(--gray-200)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <Logo logoUrl={logoUrl} height={logoHeight} />
    </header>
  );
}
