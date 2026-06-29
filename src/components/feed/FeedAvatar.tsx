/**
 * Shared circular avatar that falls back to initials when no photo exists.
 * Used by feed-style cards (provider services, service requests).
 */
export function FeedAvatar({
  src,
  name,
  size = 44,
  ring = false,
}: {
  src?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const ringCls = ring ? "ring-2 ring-green/60 ring-offset-2 ring-offset-card" : "";
  return src ? (
    <img
      src={src}
      alt={name}
      loading="lazy"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ${ringCls}`}
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-navy/10 font-bold text-navy ${ringCls}`}
    >
      <span style={{ fontSize: Math.round(size * 0.36) }}>{initials}</span>
    </div>
  );
}
