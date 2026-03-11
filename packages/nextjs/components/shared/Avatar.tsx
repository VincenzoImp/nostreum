"use client";

import { useState } from "react";
import Image from "next/image";

interface AvatarProps {
  src?: string;
  name?: string;
  pubkey: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  verified?: boolean;
}

const sizeMap = {
  sm: { container: "w-8 h-8", text: "text-xs", img: 32 },
  md: { container: "w-10 h-10", text: "text-sm", img: 40 },
  lg: { container: "w-14 h-14", text: "text-lg", img: 56 },
  xl: { container: "w-20 h-20", text: "text-2xl", img: 80 },
};

function getGradient(pubkey: string): string {
  const hue1 = parseInt(pubkey.slice(0, 4), 16) % 360;
  const hue2 = (hue1 + 45) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 50%), hsl(${hue2}, 60%, 40%))`;
}

function getInitial(name?: string, pubkey?: string): string {
  if (name) return name.charAt(0).toUpperCase();
  if (pubkey) return pubkey.charAt(0).toUpperCase();
  return "?";
}

export function Avatar({ src, name, pubkey, size = "md", className = "", verified = false }: AvatarProps) {
  const [error, setError] = useState(false);
  const s = sizeMap[size];

  const ring = verified ? "ring-2 ring-accent ring-offset-2 ring-offset-base-100" : "";

  const safeSrc = src?.trim();

  if (safeSrc && !error) {
    return (
      <div className={`${s.container} rounded-full overflow-hidden shrink-0 ${ring} ${className}`}>
        <Image
          src={safeSrc}
          alt={name || "Avatar"}
          width={s.img}
          height={s.img}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={`${s.container} ${s.text} rounded-full shrink-0 flex items-center justify-center font-bold text-white ${ring} ${className}`}
      style={{ background: getGradient(pubkey) }}
    >
      {getInitial(name, pubkey)}
    </div>
  );
}
