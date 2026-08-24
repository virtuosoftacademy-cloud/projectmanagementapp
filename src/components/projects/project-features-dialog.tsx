"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogActions } from "@/components/ui/form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { updateProjectFeaturesAction } from "@/lib/actions";
import { PROJECT_FEATURES, type ProjectFeature } from "@/lib/domain";

/**
 * Picks which optional sub-pages a project has.
 *
 * Overview is not offered — it is the project itself. Switching a feature off
 * hides its sidebar entry *and* makes its route 404, so this is the real
 * on/off, not a display filter.
 */
export function ProjectFeaturesDialog({
  project,
  onClose,
}: {
  /** The project being configured, or null when the dialog is closed. */
  project: { id: string; name: string; features: ProjectFeature[] } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<ProjectFeature[]>(project?.features ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: ProjectFeature) {
    setSelected((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function submit() {
    if (!project) return;
    startTransition(async () => {
      const result = await updateProjectFeaturesAction({
        projectId: project.id,
        features: selected,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not save those features.");
        return;
      }
      setError(null);
      onClose();
      router.refresh();
    });
  }

  return (
    <FormDialog
      open={project !== null}
      onClose={onClose}
      title={`Features for ${project?.name ?? "project"}`}
      description="Choose which pages this project has. Turning one off hides it and makes its page unavailable."
    >
      <form
        className="grid gap-4 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="grid gap-3">
          {PROJECT_FEATURES.map((feature) => (
            <label
              key={feature.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.includes(feature.key)}
                onCheckedChange={() => toggle(feature.key)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-none">{feature.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{feature.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}

        <DialogActions onCancel={onClose} submitLabel="Save features" disabled={pending} />
      </form>
    </FormDialog>
  );
}
