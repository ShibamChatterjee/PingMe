import { useState } from "react";
import { avatarColor, initials } from "../lib/utils";

interface Props {
  name: string;
  src?: string | null;
  size?: number;
  borderRadius?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function Avatar({ name, src, size = 40, borderRadius = "50%", className, onClick }: Props) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        onClick={onClick}
        className={`avatar${className ? ` ${className}` : ""}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          borderRadius: borderRadius,
          objectFit: "cover",
          cursor: onClick ? "pointer" : "default",
          display: "inline-block",
        }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      className={`avatar${className ? ` ${className}` : ""}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: borderRadius,
        background: avatarColor(name),
        fontSize: Math.round(size * 0.38),
        cursor: onClick ? "pointer" : "default",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        color: "#ffffff",
        userSelect: "none",
      }}
    >
      {initials(name)}
    </div>
  );
}
