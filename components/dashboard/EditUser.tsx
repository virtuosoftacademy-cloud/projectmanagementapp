'use client';

import { apiClient } from "@/app/lib/apiclient";
import { Role } from "@/app/types";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";

type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamId?: string | null;
};

interface EditUserDialogProps {
    user: User;
    teams: Array<{ id: string; name: string }>;
    currentUserId: string; // to prevent self-editing
    children?: React.ReactNode; // custom trigger
}

export function EditUserDialog({
    user,
    teams,
    currentUserId,
    children,
}: EditUserDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const [state, formAction, isPending] = useActionState(
        async (prevState: any, formData: FormData) => {
            const name = formData.get("name") as string;
            const role = formData.get("role") as Role;
            const teamId = formData.get("teamId") as string;

            if (user.id === currentUserId) {
                return { error: "You cannot edit your own account" };
            }

            try {
                // Update name if changed
                if (name && name !== user.name) {
                    // You may need to add updateName method in apiClient if it doesn't exist
                    await apiClient.updateUserName?.(user.id, name);
                }

                // Update role
                if (role !== user.role) {
                    await apiClient.UpdateUserRole(user.id, role);
                }

                // Update team
                const newTeamId = teamId === "" ? null : teamId;
                if (newTeamId !== user.teamId) {
                    await apiClient.AssignUserToTeam(user.id, newTeamId);
                }

                router.refresh();
                toast.success("User updated successfully");
                setOpen(false);
                return { success: true };
            } catch (error) {
                const message = error instanceof Error ? error.message : "Failed to update user";
                toast.error(message);
                return { error: message };
            }
        },
        { error: null }
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="outline" size="sm">Edit</Button>}
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Update user information, role, and team assignment.
                    </DialogDescription>
                </DialogHeader>

                <form action={formAction} className="space-y-6">
                    {state?.error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                            {state.error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={user.name}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={user.email} disabled />
                            <p className="text-xs text-muted-foreground mt-1">
                                Email cannot be changed
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select name="role" defaultValue={user.role}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.USER}>User</SelectItem>
                                    <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                                    <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="teamId">Team</Label>
                            <Select name="teamId" defaultValue={user.teamId || ""}>
                                <SelectTrigger>
                                    <SelectValue placeholder="No Team" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">No Team</SelectItem>
                                    {teams.map((team) => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}