import { usePostAsOptions, type PostAsOption } from "@/hooks/use-post-as-options";

/**
 * "Posted as" identity picker used by the create/edit request forms.
 * Hidden when the user has no business identity — they can only post as themselves.
 */
export function PostAsSelector({
  userId,
  value,
  onChange,
}: {
  userId: string | null | undefined;
  value: string;
  onChange: (key: string, option: PostAsOption | undefined) => void;
}) {
  const { options, loading } = usePostAsOptions(userId);

  if (loading || options.length <= 1) return null;

  return (
    <div>
      <label className="text-xs font-medium text-navy">Post as</label>
      <select
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next, options.find((o) => o.key === next));
        }}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-orange"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Choose whether this request appears under your personal name or one of your businesses.
      </p>
    </div>
  );
}
