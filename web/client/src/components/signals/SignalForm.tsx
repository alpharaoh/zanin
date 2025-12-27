import { useState, useCallback, useEffect } from "react";
import type { Signal, CreateSignalRequest } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { XIcon, PlusIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signal?: Signal;
  onSubmit: (data: CreateSignalRequest) => Promise<void>;
  isSubmitting?: boolean;
}

interface FormData {
  name: string;
  description: string;
  goal: string;
  failureCondition: string;
  goodExamples: string[];
  badExamples: string[];
}

const SIGNAL_TEMPLATES: FormData[] = [
  {
    name: 'Reduce "like"',
    description: 'Track and reduce usage of "like" as a filler word',
    goal: 'Eliminate unnecessary "like" from speech for clearer, more confident communication',
    failureCondition:
      'Using "like" as a filler word (not for comparisons or preferences)',
    goodExamples: [],
    badExamples: [
      "I was like, really surprised",
      "It's like, you know, complicated",
    ],
  },
  {
    name: "Reduce filler words",
    description:
      "Track usage of common filler words (um, uh, you know, so, basically)",
    goal: "Speak more clearly by replacing filler words with pauses",
    failureCondition:
      'Using filler words like "um", "uh", "you know", "so", "basically", "actually", "literally"',
    goodExamples: [],
    badExamples: ["Um, so basically, you know, we should, uh, move forward"],
  },
  {
    name: "Speak with confidence",
    description:
      "Avoid hedging language and qualifiers that undermine your message",
    goal: "Communicate assertively without undermining statements with unnecessary hedges",
    failureCondition:
      'Using hedging phrases like "I think", "maybe", "sort of", "kind of", "I guess", "probably"',
    goodExamples: ["This approach will work", "We should prioritize this"],
    badExamples: ["I think maybe we should sort of consider this"],
  },
  {
    name: "Active listening",
    description:
      "Demonstrate engagement by asking follow-up questions and not interrupting",
    goal: "Show genuine interest in conversations through active engagement",
    failureCondition:
      "Interrupting others, not asking follow-up questions, or immediately redirecting to self",
    goodExamples: [
      "That's interesting, can you tell me more?",
      "Oh, I see. How did that make you feel?",
    ],
    badExamples: [
      "Yeah but anyway, let me tell you about...",
      "Right, right, so I...",
    ],
  },
  {
    name: "Be concise",
    description: "Get to the point without unnecessary rambling or repetition",
    goal: "Communicate ideas clearly and efficiently",
    failureCondition:
      "Repeating the same point multiple times, excessive preamble, or going off on tangents",
    goodExamples: ["The main issue is X. Here's how we fix it."],
    badExamples: [
      "So what I wanted to say, and this is really important, is that, well, the thing is...",
    ],
  },
];

export function SignalForm({
  open,
  onOpenChange,
  signal,
  onSubmit,
  isSubmitting,
}: SignalFormProps) {
  // Track editing state separately to prevent flash when closing modal
  const [isEditing, setIsEditing] = useState(!!signal);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    goal: "",
    failureCondition: "",
    goodExamples: [],
    badExamples: [],
  });

  const [newGoodExample, setNewGoodExample] = useState("");
  const [newBadExample, setNewBadExample] = useState("");

  useEffect(() => {
    if (open) {
      // Only update isEditing when opening, not during close animation
      setIsEditing(!!signal);
      if (signal) {
        setFormData({
          name: signal.name,
          description: signal.description,
          goal: signal.goal,
          failureCondition: signal.failureCondition,
          goodExamples: signal.goodExamples ?? [],
          badExamples: signal.badExamples ?? [],
        });
      } else {
        setFormData({
          name: "",
          description: "",
          goal: "",
          failureCondition: "",
          goodExamples: [],
          badExamples: [],
        });
      }
      setNewGoodExample("");
      setNewBadExample("");
    }
  }, [open, signal]);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addGoodExample = useCallback(() => {
    const trimmed = newGoodExample.trim();
    if (trimmed && !formData.goodExamples.includes(trimmed)) {
      updateField("goodExamples", [...formData.goodExamples, trimmed]);
      setNewGoodExample("");
    }
  }, [newGoodExample, formData.goodExamples, updateField]);

  const removeGoodExample = useCallback(
    (example: string) => {
      updateField(
        "goodExamples",
        formData.goodExamples.filter((e) => e !== example)
      );
    },
    [formData.goodExamples, updateField]
  );

  const addBadExample = useCallback(() => {
    const trimmed = newBadExample.trim();
    if (trimmed && !formData.badExamples.includes(trimmed)) {
      updateField("badExamples", [...formData.badExamples, trimmed]);
      setNewBadExample("");
    }
  }, [newBadExample, formData.badExamples, updateField]);

  const removeBadExample = useCallback(
    (example: string) => {
      updateField(
        "badExamples",
        formData.badExamples.filter((e) => e !== example)
      );
    },
    [formData.badExamples, updateField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim(),
        goal: formData.goal.trim(),
        failureCondition: formData.failureCondition.trim(),
        goodExamples: formData.goodExamples,
        badExamples: formData.badExamples,
      });
    },
    [formData, onSubmit]
  );

  const isValid =
    formData.name.trim() &&
    formData.description.trim() &&
    formData.goal.trim() &&
    formData.failureCondition.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto",
          isEditing ? "sm:max-w-md" : "sm:max-w-4xl"
        )}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">
              {isEditing ? "Edit Signal" : "Create Signal"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEditing
                ? "Update your signal's tracking definition"
                : "Define a behavioral pattern to track across recordings"}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn("mt-6", !isEditing && "grid gap-6 sm:grid-cols-2")}
          >
            {/* Form Fields */}
            <div className="space-y-5">
              <FormField label="Name">
                <Input
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., Reduce filler words"
                  maxLength={100}
                />
              </FormField>

              <FormField label="Description">
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What behavior pattern should be tracked?"
                  rows={2}
                />
              </FormField>

              <FormField label="Goal">
                <Textarea
                  value={formData.goal}
                  onChange={(e) => updateField("goal", e.target.value)}
                  placeholder="What is the ideal outcome?"
                  rows={2}
                />
              </FormField>

              <FormField label="Failure Condition">
                <Textarea
                  value={formData.failureCondition}
                  onChange={(e) =>
                    updateField("failureCondition", e.target.value)
                  }
                  placeholder="What constitutes a failure? Be specific."
                  rows={2}
                />
              </FormField>

              <FormField label="Good Examples" optional>
                <div className="flex gap-2">
                  <Input
                    value={newGoodExample}
                    onChange={(e) => setNewGoodExample(e.target.value)}
                    placeholder="Add an example..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGoodExample();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addGoodExample}
                    disabled={!newGoodExample.trim()}
                    className="shrink-0"
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </div>
                <ExampleTags
                  examples={formData.goodExamples}
                  onRemove={removeGoodExample}
                  variant="success"
                />
              </FormField>

              <FormField label="Bad Examples" optional>
                <div className="flex gap-2">
                  <Input
                    value={newBadExample}
                    onChange={(e) => setNewBadExample(e.target.value)}
                    placeholder="Add an example..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBadExample();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addBadExample}
                    disabled={!newBadExample.trim()}
                    className="shrink-0"
                  >
                    <PlusIcon className="size-4" />
                  </Button>
                </div>
                <ExampleTags
                  examples={formData.badExamples}
                  onRemove={removeBadExample}
                  variant="error"
                />
              </FormField>
            </div>

            {/* Templates Panel - only show when creating */}
            {!isEditing && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{">"} templates</p>
                <div className="grid grid-cols-1 gap-2">
                  {SIGNAL_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => setFormData(template)}
                      className="group border border-border p-3 text-left transition-colors hover:border-primary/50"
                    >
                      <p className="text-xs font-medium text-foreground group-hover:text-primary">
                        {template.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="h-8"
            >
              {isSubmitting && (
                <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
              )}
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">
        {label}
        {optional && (
          <span className="ml-1 text-muted-foreground/50">(optional)</span>
        )}
      </label>
      {children}
    </div>
  );
}

function ExampleTags({
  examples,
  onRemove,
  variant,
}: {
  examples: string[];
  onRemove: (example: string) => void;
  variant: "success" | "error";
}) {
  if (examples.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {examples.map((example) => (
        <span
          key={example}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs",
            variant === "success" &&
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            variant === "error" &&
              "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {example}
          <button
            type="button"
            onClick={() => onRemove(example)}
            className="ml-0.5 opacity-60 hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
