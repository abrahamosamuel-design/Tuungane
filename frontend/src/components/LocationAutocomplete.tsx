import { useState, useRef, useEffect } from "react";
import { MapPin } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({ label, value, onChange, suggestions, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 transition ${
        focused ? "border-orange-400 ring-2 ring-orange-100" : "border-gray-200"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
        <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? `Type ${label.toLowerCase()}…`}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
        />
        {value && !disabled && (
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            className="text-gray-300 hover:text-gray-500 text-xs leading-none">✕</button>
        )}
      </div>

      {showDropdown && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {suggestions.map(s => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(s); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                {highlightMatch(s, value)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-orange-500">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}
