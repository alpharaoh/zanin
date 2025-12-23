import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CornerDownLeftIcon, Loader2Icon, XIcon } from "lucide-react";
import { useState, useCallback, type FormEvent } from "react";
import type { RecordingAskResponse } from "@/api";

interface AskAIProps {
  onAsk: (query: string) => Promise<RecordingAskResponse>;
  placeholder?: string;
  className?: string;
}

export function AskAI({
  onAsk,
  placeholder = "ask a question...",
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

  return (
    <div className={cn("border border-border", className)}>
      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-3 px-4 py-3"
      >
        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-400">
          AI
        </span>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
        />
        {isLoading ? (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <CornerDownLeftIcon className="size-3" />
          </span>
        )}
      </form>

      {/* Response */}
      {(isLoading || response || error) && (
        <div className="border-t border-border bg-card/50 px-4 py-3">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">...</p>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : response ? (
            <div className="space-y-3">
              {/* Answer */}
              <p className="text-sm leading-relaxed">{response.answer}</p>

              {/* Sources */}
              {response.sources && response.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {response.sources.map((source, i) => (
                    <Link
                      key={i}
                      to="/dashboard/recordings/$recordingId"
                      params={{ recordingId: source.recordingId }}
                      className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      [{i + 1}]
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
