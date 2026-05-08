type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 32, className = '' }: BrandLogoProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        background: 'linear-gradient(135deg, #ec4899 0%, #d4a373 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.max(12, Math.round(size * 0.34)),
        letterSpacing: '-0.04em',
        boxShadow: '0 10px 24px rgba(236, 72, 153, 0.24)',
      }}
      aria-label="Bellah Beatrix"
    >
      BB
    </div>
  );
}
