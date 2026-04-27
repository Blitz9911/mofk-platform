interface MfkLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { height: 32, width: 80 },
  md: { height: 42, width: 106 },
  lg: { height: 54, width: 136 },
};

export function MfkLogo({ size = "md", className = "" }: MfkLogoProps) {
  const { height, width } = SIZES[size];
  return (
    <img
      src="/mfk-logo.png"
      alt="MFK"
      height={height}
      width={width}
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
      draggable={false}
    />
  );
}
