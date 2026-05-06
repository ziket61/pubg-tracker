import { getItemIcon } from "@/lib/assets/icons";

export function ItemIcon({
  itemId,
  size = 32,
  alt = "",
}: {
  itemId: string;
  size?: number;
  alt?: string;
}) {
  const src = getItemIcon(itemId);
  if (src) {
    return (
      // We intentionally use a plain <img> here, not next/image. Reason: the project
      // sets images.unoptimized: true (no remote loader / no AVIF), so next/image only
      // adds ~3KB of client JS without delivering optimization. <img> is leaner.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        width={size}
        height={size}
        alt={alt}
        loading="lazy"
        className="inline-block rounded bg-bg-subtle object-contain"
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={alt || itemId}
      className="inline-flex items-center justify-center rounded border border-border bg-bg-subtle text-fg-subtle"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      ?
    </span>
  );
}
