'use client';

import { apiClient } from "@/app/lib/apiclient";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { refresh } from "next/cache";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

export type RegisterStatus = {
    error?: string;
    success?: boolean;
};

export function CreateAccount() {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const [state, registerAction, isPending] = useActionState(
        async (
            prevState: RegisterStatus,
            formData: FormData
        ): Promise<RegisterStatus> => {
            const name = formData.get("name") as string;
            const email = formData.get("email") as string;
            const password = formData.get("password") as string;
            const teamCode = formData.get("teamCode") as string;

            try {
                await apiClient.Register({
                    name,
                    email,
                    password,
                    teamCode: teamCode || undefined,
                });
                return { success: true };
            } catch (error) {
                return {
                    error: error instanceof Error ? error.message : "Registration failed",
                };
            }
        },
        { error: undefined, success: undefined }
    );

    // Auto-close and redirect on success
    useEffect(() => {
        if (state?.success) {
            toast.success("Registration Successful!");
            const timer = setTimeout(() => {
                setOpen(false);
                refresh()
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg">Create Account</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create an account</DialogTitle>
                    <DialogDescription>
                        Enter your information below to create your account
                    </DialogDescription>
                </DialogHeader>

                <form action={registerAction} className="space-y-6">
                    {state?.error && (
                        <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-md border border-red-200">
                            {state.error}
                        </div>
                    )}

                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">Full Name</FieldLabel>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                            <FieldDescription>
                                Must be at least 8 characters long.
                            </FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="teamCode">Team Code (Optional)</FieldLabel>
                            <Input
                                id="teamCode"
                                name="teamCode"
                                type="text"
                                placeholder="e.g. TEAM123"
                            />
                        </Field>
                    </FieldGroup>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending}
                    >
                        {isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>

            </DialogContent>
        </Dialog>
    );
}