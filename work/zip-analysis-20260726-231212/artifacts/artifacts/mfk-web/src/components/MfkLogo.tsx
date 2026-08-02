interface MfkLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: { height: 28 },
  md: { height: 38 },
  lg: { height: 52 },
};

export function MfkLogo({ size = "md", className = "" }: MfkLogoProps) {
  const { height } = SIZES[size];
  return (
    <img
      src="/mfk-logo-ar-nobg.png"
      alt="لمفك"
      height={height}
      className={className}
      style={{ height, width: "auto", objectFit: "contain" }}
      draggable={false}
    />
  );
}
