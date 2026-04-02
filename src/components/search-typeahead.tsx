"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Suggestion {
  name: string;
  category: string | null;
  restaurant: string;
}

interface SearchTypeaheadProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchTypeahead({
  value,
  onChange,
  onSelect,
  placeholder = "What are you craving?",
  className,
}: SearchTypeaheadProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();

    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(query)}&limit=5`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        const items: Suggestion[] = data.suggestions ?? [];
        setSuggestions(items);
        setIsOpen(items.length > 0);
        setActiveIndex(-1);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Debounce fetch on value change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [value, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(name: string) {
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    onSelect(name);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) {
      // Allow Enter to trigger search even with no suggestions
      if (e.key === "Enter") {
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex].name);
        } else {
          setIsOpen(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const listboxId = "search-typeahead-listbox";

  return (
    <div ref={containerRef} className={`relative flex-1 ${className ?? ""}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 z-10 pointer-events-none" />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 animate-spin z-10 pointer-events-none" />
      )}
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className="h-10 text-sm pl-9 pr-9 rounded-xl bg-muted/50 border-border/30 focus:bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        aria-haspopup="listbox"
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1.5 bg-background border border-border/40 rounded-xl shadow-lg shadow-black/10 overflow-hidden z-50"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.name}-${s.restaurant}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`flex items-start gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                i === activeIndex
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/60 text-foreground"
              }`}
              onMouseDown={(e) => {
                // Use mousedown instead of click to fire before blur
                e.preventDefault();
                handleSelect(s.name);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <Search className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {s.restaurant}
                  {s.category && (
                    <span className="ml-1.5 text-muted-foreground/60">
                      · {s.category}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
