import { cn } from "@/lib/utils";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface AISearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function AISearchBar({ onSearch, isLoading, className }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your recordings..."
        disabled={isLoading}
        className={cn(
          "h-11 w-full border-b bg-transparent px-0 text-sm",
          "placeholder:text-muted-foreground/60",
          "focus:outline-none focus:border-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200"
        )}
      />
      <button
        type="submit"
        disabled={!query.trim() || isLoading}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2",
          "flex items-center gap-1 text-xs font-medium",
          "text-muted-foreground transition-colors",
          "hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
        )}
      >
        {isLoading ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <>
            Ask
            <ArrowRightIcon className="size-3" />
          </>
        )}
      </button>
    </form>
  );
}
