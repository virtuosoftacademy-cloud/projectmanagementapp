"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Plus } from "lucide-react";
import {
  createCustomRoleAction,
  deleteCustomRoleAction,
  updateCustomRoleAction,
} from "@/app/(app)/admin/users/roles/actions";
import type { CustomRoleRow } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { FormDialog } from "@/components/ui/form-dialog";
import { DialogActions } from "@/components/ui/form-actions";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@/lib/domain";
import {
  PERMISSION_LABELS,
  ROLES,
  permissionsFor,
  roleLabel,
  type Permission,
} from "@/lib/permissions";

/** Mirrors `FORBIDDEN_IN_CUSTOM_ROLES` in the action, which is authoritative. */
const NEVER_GRANTABLE: Permission[] = ["roles.manage"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Create or edit a role.
 *
 * The permission list is bounded by whichever base role is selected: switching
 * `inheritsFrom` re-derives what can be ticked and drops anything the new base
 * does not allow. That mirrors the server, which intersects with the same
 * ceiling — showing a permission here that the action would strip on save would
 * be worse than not offering it.
 */
export function RoleDialog({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  /** Absent when creating. */
  role?: CustomRoleRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    name: role?.name ?? "",
    label: role?.label ?? "",
    description: role?.description ?? "",
    inheritsFrom: (role?.inheritsFrom ?? "member") as Role,
    permissions: (role?.permissions ?? []) as string[],
  });
  const [nameTouched, setNameTouched] = useState(Boolean(role));

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // What this role may hold, given its base role — minus the escalation route.
  const grantable = useMemo(
    () =>
      permissionsFor(draft.inheritsFrom).filter(
        (permission) => !NEVER_GRANTABLE.includes(permission),
      ),
    [draft.inheritsFrom],
  );

  const selected = draft.permissions.filter((permission) =>
    grantable.includes(permission as Permission),
  );
  const allSelected = selected.length === grantable.length && grantable.length > 0;

  function changeBase(next: Role) {
    setDraft((current) => {
      const ceiling = permissionsFor(next).filter(
        (permission) => !NEVER_GRANTABLE.includes(permission),
      );
      return {
        ...current,
        inheritsFrom: next,
        // Drop anything the new base cannot grant, so what is ticked is always
        // what would actually be saved.
        permissions: current.permissions.filter((permission) =>
          ceiling.includes(permission as Permission),
        ),
      };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = { ...draft, permissions: selected };

    startTransition(async () => {
      const result = role
        ? await updateCustomRoleAction(role.id, payload)
        : await createCustomRoleAction(payload);

      if (!result.ok) {
        setError(result.error ?? "Could not save that role.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={role ? `Edit ${role.label}` : "Create New Role"}
      description={
        role
          ? "Changes apply to everyone holding this role on their next request."
          : "Define a role, pick the base role it inherits from, then choose its permissions."
      }
      className="max-w-2xl"
    >
      <form className="grid gap-4 py-2" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role label" required>
            <Input
              required
              value={draft.label}
              placeholder="e.g. Project Lead"
              onChange={(event) => {
                const value = event.target.value;
                set("label", value);
                if (!nameTouched) set("name", slugify(value));
              }}
            />
          </Field>

          <Field label="Role name" hint="Lowercase key, unique in this workspace." required>
            <Input
              required
              value={draft.name}
              placeholder="project-lead"
              onChange={(event) => {
                setNameTouched(true);
                set("name", event.target.value);
              }}
            />
          </Field>
        </div>

        <Field label="Description">
          <Textarea
            value={draft.description}
            placeholder="What this role is for."
            onChange={(event) => set("description", event.target.value)}
          />
        </Field>

        <Field
          label="Inherits from"
          hint="The base role this one behaves as. Its permissions are the ceiling — a role can never grant more than its base."
          required
        >
          <SelectField
            value={draft.inheritsFrom}
            onValueChange={(value) => changeBase(value as Role)}
            options={ROLES.map((base) => ({ value: base, label: roleLabel(base) }))}
          />
        </Field>

        <fieldset>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <legend className="text-sm font-medium leading-none">
              Permissions (<span className="font-mono">{selected.length}</span>/
              <span className="font-mono">{grantable.length}</span>)
            </legend>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={pending || grantable.length === 0}
              onClick={() => set("permissions", allSelected ? [] : [...grantable])}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {grantable.length === 0 ? (
            <p className="rounded-md border p-3 text-sm text-muted-foreground">
              {roleLabel(draft.inheritsFrom)} holds no permissions, so a role inheriting from
              it has nothing to grant.
            </p>
          ) : (
            <div className="grid gap-1 rounded-md border p-2 sm:grid-cols-2">
              {grantable.map((permission) => (
                <label
                  key={permission}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(permission)}
                    onChange={() =>
                      set(
                        "permissions",
                        selected.includes(permission)
                          ? draft.permissions.filter((item) => item !== permission)
                          : [...draft.permissions, permission],
                      )
                    }
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  {PERMISSION_LABELS[permission]}
                </label>
              ))}
            </div>
          )}

          <p className="mt-1.5 text-xs text-muted-foreground">
            Managing roles is never offered — a role that could edit itself would not stay
            bounded by its base.
          </p>
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogActions
            onCancel={onClose}
            submitLabel={pending ? "Saving…" : role ? "Save role" : "Create role"}
            disabled={pending}
          />
        </div>
      </form>
    </FormDialog>
  );
}

/** Header button plus the create dialog, for the roles screen. */
export function CreateRoleButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Create role
      </Button>
      {open ? <RoleDialog key="create" open onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Edit + Delete for one custom role. */
export function RoleRowActions({ role }: { role: CustomRoleRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="xs"
          disabled={role.isSystem || pending}
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={role.isSystem || pending}
          onClick={() => setRemoving(true)}
        >
          Delete
        </Button>
      </div>

      {editing ? (
        <RoleDialog key={role.id} open onClose={() => setEditing(false)} role={role} />
      ) : null}

      <ConfirmDialog
        open={removing}
        onClose={() => setRemoving(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteCustomRoleAction(role.id);
            setRemoving(false);
            router.refresh();
          })
        }
        title={`Delete ${role.label}?`}
        description={
          role.memberCount > 0
            ? `${role.memberCount} ${
                role.memberCount === 1 ? "person holds" : "people hold"
              } this role. They keep their account and fall back to the ${roleLabel(
                role.inheritsFrom,
              )} role it inherits from, which may grant them more than this role did.`
            : "Nobody holds this role, so nothing else changes."
        }
      />
    </>
  );
}
