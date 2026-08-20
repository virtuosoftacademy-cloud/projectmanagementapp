"use client";

import { useActionState } from "react";
import { CircleAlert } from "lucide-react";
import { signInAction, type SignInState } from "@/app/signin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function SignInForm({ from }: { from: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="from" value={from} />

      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@company.com"
        />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" required autoComplete="current-password" />
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
