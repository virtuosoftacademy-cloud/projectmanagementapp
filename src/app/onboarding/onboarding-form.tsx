"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createWorkspaceAction } from "@/lib/workspace-actions";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Creates the caller's first workspace and moves them into it.
 *
 * The `update({ workspaceId })` step matters: the account signed in with a null
 * workspace, so the JWT still says so. Without refreshing it, `requireUser`
 * would bounce straight back to onboarding even though the workspace now
 * exists.
 */
export function OnboardingForm() {
  const router = useRouter();
  const { update } = useSession();
  const [draft, setDraft] = useState({ name: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createWorkspaceAction(draft);
      if (!result.ok || !result.workspaceId) {
        setError(result.error ?? "Could not create that workspace.");
        return;
      }
      setError(null);
      await update({ workspaceId: result.workspaceId });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field label="Workspace name" error={error ?? undefined}>
        <Input
          required
          autoFocus
          value={draft.name}
          placeholder="e.g. Acme Corp"
          onChange={(event) => {
            const name = event.target.value;
            setDraft((current) => ({
              ...current,
              name,
              slug: slugTouched ? current.slug : slugify(name),
            }));
          }}
        />
      </Field>

      <Field label="URL slug" hint="Lowercase letters, numbers and hyphens">
        <Input
          required
          value={draft.slug}
          placeholder="acme-corp"
          onChange={(event) => {
            setSlugTouched(true);
            setDraft((current) => ({ ...current, slug: event.target.value }));
          }}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
