import { initials } from "@/lib/format";

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const s = `${size}px`;
  if (url) {
    return <img src={url} alt={name} style={{ width: s, height: s }} className="rounded-full object-cover" />;
  }
  return (
    <div
      style={{ width: s, height: s }}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-navy to-orange text-xs font-semibold text-white"
    >
      {initials(name || "U")}
    </div>
  );
}
