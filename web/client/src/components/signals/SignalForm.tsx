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

export function SignalForm({
  open,
  onOpenChange,
  signal,
  onSubmit,
  isSubmitting,
}: SignalFormProps) {
  const isEditing = !!signal;

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

  // Reset form when dialog opens/closes or signal changes
  useEffect(() => {
    if (open) {
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
        goodExamples:
          formData.goodExamples.length > 0 ? formData.goodExamples : undefined,
        badExamples:
          formData.badExamples.length > 0 ? formData.badExamples : undefined,
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {">"} {isEditing ? "edit_signal" : "new_signal"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "update your signal tracking definition"
                : "define a behavior pattern to track across your recordings"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">name</label>
              <Input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Reduce filler words"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What behavior pattern should be tracked?"
                rows={2}
              />
            </div>

            {/* Goal */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">goal</label>
              <Textarea
                value={formData.goal}
                onChange={(e) => updateField("goal", e.target.value)}
                placeholder="What is the ideal outcome you want to achieve?"
                rows={2}
              />
            </div>

            {/* Failure Condition */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                failure condition
              </label>
              <Textarea
                value={formData.failureCondition}
                onChange={(e) => updateField("failureCondition", e.target.value)}
                placeholder="What constitutes a failure? Be specific."
                rows={2}
              />
            </div>

            {/* Good Examples */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                good examples{" "}
                <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={newGoodExample}
                  onChange={(e) => setNewGoodExample(e.target.value)}
                  placeholder="Add an example of good behavior..."
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
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
              {formData.goodExamples.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.goodExamples.map((example) => (
                    <span
                      key={example}
                      className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      {example}
                      <button
                        type="button"
                        onClick={() => removeGoodExample(example)}
                        className="hover:text-emerald-700 dark:hover:text-emerald-300"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bad Examples */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                bad examples{" "}
                <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <div className="flex gap-2">
                <Input
                  value={newBadExample}
                  onChange={(e) => setNewBadExample(e.target.value)}
                  placeholder="Add an example of bad behavior..."
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
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>
              {formData.badExamples.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {formData.badExamples.map((example) => (
                    <span
                      key={example}
                      className="inline-flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-600 dark:text-red-400"
                    >
                      {example}
                      <button
                        type="button"
                        onClick={() => removeBadExample(example)}
                        className="hover:text-red-700 dark:hover:text-red-300"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting && (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              )}
              {isEditing ? "save" : "create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
