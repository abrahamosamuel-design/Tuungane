import { ExpandableText } from "@/components/feed/ExpandableText";

/**
 * Post caption/message — clamps to 3 lines by default with a "Show more"
 * toggle that expands up to a maximum of 10 lines.
 */
export function PostText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;
  return <ExpandableText text={text} clampLines={3} maxLines={8} className={className} />;
}
