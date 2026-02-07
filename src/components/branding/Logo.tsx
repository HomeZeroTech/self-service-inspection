import { useState } from 'react';
import logoFallback from '../../assets/logo_home_zero.png';

interface LogoProps {
  logoUrl?: string;
  height?: number;
  className?: string;
}

/**
 * Logo Component
 *
 * Displays logo from API URL with graceful fallback to local asset.
 * - Falls back to local logo_home_zero.png if API logo fails to load
 * - Height controlled by prop (from API config)
 * - Width scales proportionally to maintain aspect ratio
 */
export function Logo({ logoUrl, height = 40, className }: LogoProps) {
  const [imgSrc, setImgSrc] = useState(logoUrl || logoFallback);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      // Switch to fallback on error
      setImgSrc(logoFallback);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt="logo"
      height={height}
      className={className}
      onError={handleError}
      style={{
        height: `${height}px`,
        width: 'auto',
        display: 'block',
      }}
    />
  );
}
