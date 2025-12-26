import { cn } from "@/lib/utils";
import { ArrowUpIcon } from "lucide-react";
import {
  useState,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "ask about your recordings...",
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) {
        return;
      }
      onSend(trimmed);
      setValue("");
    },
    [value, disabled, onSend]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed && !disabled) {
          onSend(trimmed);
          setValue("");
        }
      }
    },
    [value, disabled, onSend]
  );

  const hasInput = value.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card/50">
      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <div className="flex flex-1 items-start gap-2">
          <span className="mt-0 text-xs text-primary">$</span>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="max-h-32 min-h-[32px] flex-1 resize-none bg-transparent text-xs outline-none placeholder:text-muted-foreground/40 placeholder:italic disabled:opacity-50"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </div>

        <button
          type="submit"
          disabled={!hasInput || disabled}
          className={cn(
            "flex size-7 shrink-0 items-center justify-center border transition-all",
            hasInput && !disabled
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
              : "border-border bg-muted text-muted-foreground"
          )}
        >
          <ArrowUpIcon className="size-4" />
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] uppercase tracking-wider text-muted-foreground"
            title="Zanin AI Recording Assistant"
          >
            z.a.r.a
          </span>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                disabled
                  ? "animate-pulse bg-amber-500"
                  : hasInput
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/30"
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {disabled ? "busy" : hasInput ? "ready" : "idle"}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground/50">
          enter to send
        </span>
      </div>
    </form>
  );
}
