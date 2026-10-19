import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { searchPlaces, type Bounds, type PlaceSuggestion } from "@/lib/geocoding";

type Props = {
  placeholder?: string;
  onSelect: (place: PlaceSuggestion) => void;
  className?: string;
  /** When supplied, biases (and optionally restricts) results to within these bounds. */
  bounds?: Bounds | null;
  /** When true with `bounds`, hard-restrict results to the bounding box. */
  strict?: boolean;
};

/**
 * Debounced place search input. Uses OSM Nominatim, biased to Uganda.
 * Lets users pick a precise area/neighbourhood/district rather than free-typing.
 */
export function AreaAutocomplete({ placeholder = "Search for a town, area, or neighbourhood…", onSelect, className, bounds, strict }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      const r = await searchPlaces(q, controller.signal, {
        bounds: bounds ?? undefined,
        strict: strict ?? false,
      });
      setResults(r);
      setLoading(false);
      setOpen(true);
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query, bounds, strict]);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-9 text-sm focus:border-orange focus:outline-none"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-background shadow-lg">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <span className="line-clamp-2 text-navy">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && query.trim().length >= 3 && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground shadow-lg">
          No matches. Try a nearby town or district.
        </div>
      )}
    </div>
  );
}
