import { ExpandableText } from "@/components/feed/ExpandableText";

/**
 * Post caption/message — clamps to 3 lines by default with a "Show more"
 * toggle that expands up to a maximum of 10 lines.
 */
export function PostText({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      if (parsed.type === "job_request") {
        return (
          <div className={`mt-2 rounded-xl bg-orange/5 border border-orange/20 p-4 ${className}`}>
            {parsed.job_title && (
              <h4 className="font-bold text-navy text-base mb-1">{parsed.job_title}</h4>
            )}
            {parsed.resume_summary && (
              <ExpandableText text={parsed.resume_summary} clampLines={3} maxLines={8} className="text-sm text-muted-foreground whitespace-pre-wrap" />
            )}
          </div>
        );
      }
    }
  } catch (e) {
    // text is not JSON, proceed to render as regular text
  }

  return <ExpandableText text={text} clampLines={3} maxLines={8} className={className} />;
}
