import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowUpIcon, XIcon } from "lucide-react";
import { useState, useCallback, type FormEvent } from "react";
import type { RecordingAskResponse } from "@/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

interface AskAIProps {
  onAsk: (query: string) => Promise<RecordingAskResponse>;
  placeholder?: string;
  className?: string;
}

function truncateText(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + "...";
}

export function AskAI({
  onAsk,
  placeholder = '"How could I have handled the situation today better?"',
  className,
}: AskAIProps) {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<RecordingAskResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isLoading) {
        return;
      }

      setQuery(trimmed);
      setResponse(null);
      setError(null);
      setIsLoading(true);

      try {
        const result = await onAsk(trimmed);
        setResponse(result);
      } catch (err) {
        console.error("AI query failed:", err);
        setError("failed to get response");
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, onAsk]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setInputValue("");
    setResponse(null);
    setError(null);
  }, []);

  const hasInput = inputValue.trim().length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Input Box */}
      <form
        onSubmit={handleSubmit}
        className="group relative overflow-hidden border border-border bg-gradient-to-b from-card to-background"
      >
        {/* Grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-30 grid-pattern" />

        {/* Header bar */}
        <div className="relative flex items-center justify-between border-b border-border bg-card/80 px-4 py-2">
          <span className="text-xs text-muted-foreground">{">"} ask_ai</span>
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-3" />
              clear
            </button>
          )}
        </div>

        {/* Input area */}
        <div className="relative px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary">$</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 placeholder:italic disabled:opacity-50"
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative flex items-center justify-between border-t border-border bg-card/50 px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              ai
            </span>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  isLoading
                    ? "animate-pulse bg-amber-500"
                    : hasInput
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                )}
              />
              <span className="text-[10px] text-muted-foreground">
                {isLoading ? "busy" : hasInput ? "ready" : "idle"}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!hasInput || isLoading}
            className={cn(
              "flex size-7 items-center justify-center border transition-all",
              hasInput && !isLoading
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </form>

      {/* Response */}
      {(isLoading || response || error) && (
        <div className="relative overflow-hidden border border-border bg-gradient-to-b from-card to-background">
          {/* Grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-20 grid-pattern" />

          {/* Header */}
          <div className="relative flex items-center gap-2 border-b border-border bg-card/80 px-4 py-2">
            <span className="text-xs text-muted-foreground">
              {">"} {error ? "error" : "ai_response"}
            </span>
          </div>

          {/* Content */}
          <div className="relative p-4">
            {isLoading ? (
              <Spinner label="processing" />
            ) : error ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">ERR:</span>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : response ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed">{response.answer}</p>

                {response.sources && response.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      sources
                    </span>
                    {response.sources.map((source, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger>
                          <Link
                            to="/dashboard/recordings/$recordingId"
                            params={{ recordingId: source.recordingId }}
                            className="border border-border bg-card/50 px-1.5 py-0.5 text-xs text-primary transition-colors hover:border-primary/50 hover:bg-primary/10"
                          >
                            [{i + 1}]
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs border border-border bg-card p-3"
                        >
                          <p className="text-xs leading-snug text-muted-foreground">
                            "{truncateText(source.text)}"
                          </p>
                          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[10px]">
                            <span className="text-muted-foreground">
                              {Math.round(source.score * 100)}% match
                            </span>
                            <Link
                              to="/dashboard/recordings/$recordingId"
                              params={{ recordingId: source.recordingId }}
                              className="text-primary"
                            >
                              view recording →
                            </Link>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
