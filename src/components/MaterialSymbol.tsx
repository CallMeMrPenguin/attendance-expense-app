import React from 'react';

interface MaterialSymbolProps {
  icon: string;
  className?: string;
  fill?: boolean;
  weight?: number;
  grade?: number;
  size?: number;
  style?: React.CSSProperties;
}

export function MaterialSymbol({
  icon,
  className = '',
  fill = false,
  weight = 400,
  grade = 0,
  size = 24,
  style
}: MaterialSymbolProps) {
  const fontVariationSettings = `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${size}`;

  return (
    <span
      className={`material-symbols-outlined select-none shrink-0 inline-block align-middle ${className}`}
      style={{
        fontVariationSettings,
        fontSize: size ? `${size}px` : undefined,
        lineHeight: 1,
        ...style
      }}
    >
      {icon}
    </span>
  );
}

export default MaterialSymbol;
