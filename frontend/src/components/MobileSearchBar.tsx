import { Search, ScanLine } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function MobileSearchBar({ 
  placeholder = "Search for services",
  value,
  onChange,
  className
}: { 
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={className !== undefined ? className : "px-4 py-3 md:hidden bg-white"}>
      <div className="flex w-full items-center gap-2 rounded-full border border-border/40 bg-white px-5 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] transition-all focus-within:border-orange focus-within:shadow-[0_4px_20px_-4px_rgba(234,88,12,0.15)]">
        <Search className="h-5 w-5 text-navy/70" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-[15px] font-medium text-navy outline-none placeholder:text-muted-foreground/80"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              if (onChange) {
                onChange({ target: { value: "" } } as any);
              }
            }}
            aria-label="Clear search"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        ) : (
          <button type="button" aria-label="Scan" className="flex h-10 w-10 items-center justify-center rounded-full bg-orange/10 text-orange hover:bg-orange/20 transition-colors">
            <ScanLine className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
