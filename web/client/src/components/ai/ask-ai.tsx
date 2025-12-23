import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowUpIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState, useCallback, useEffect, type FormEvent } from "react";
import type { RecordingAskResponse } from "@/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AskAIProps {
  onAsk: (query: string) => Promise<RecordingAskResponse>;
  placeholder?: string;
  className?: string;
}

const SPINNER_FRAMES = ["/", "—", "\\", "|"];

function AsciiLoader() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-xs text-muted-foreground">
      {SPINNER_FRAMES[frame]} processing
    </span>
  );
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
      <form onSubmit={handleSubmit} className="border border-border">
        {/* Text input area */}
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 placeholder:italic disabled:opacity-50"
          />
          {query && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <XIcon className="size-3" />
              Clear
            </button>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">AI</span>

          <button
            type="submit"
            disabled={!hasInput || isLoading}
            className={cn(
              "flex size-7 items-center justify-center transition-colors",
              hasInput && !isLoading
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLoading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </button>
        </div>
      </form>

      {/* Response */}
      {(isLoading || response || error) && (
        <div className="border border-border p-4">
          {isLoading ? (
            <AsciiLoader />
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : response ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">{response.answer}</p>

              {response.sources && response.sources.length > 0 && (
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">sources</span>
                  <div className="flex flex-wrap gap-1">
                    {response.sources.map((source, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Link
                            to="/dashboard/recordings/$recordingId"
                            params={{ recordingId: source.recordingId }}
                            className="border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                          >
                            [{i + 1}]
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-xs p-3"
                        >
                          <p className="text-xs leading-snug text-neutral-300">
                            "{truncateText(source.text)}"
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">
                              {Math.round(source.score * 100)}% match
                            </span>
                            <Link
                              to="/dashboard/recordings/$recordingId"
                              params={{ recordingId: source.recordingId }}
                              className="text-primary hover:underline"
                            >
                              view recording →
                            </Link>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
