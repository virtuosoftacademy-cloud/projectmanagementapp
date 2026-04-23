import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CirclePlusIcon } from "lucide-react"

export function AddWorkspace() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button >
            <CirclePlusIcon
              size={20}
            />
            Add WorkSpace</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Set up a new workspace for yourself and your team.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Workspace Name</Label>
              <Input id="name-1" name="name" defaultValue="Workspace" />
            </Field>
            <Field>
              <Label htmlFor="slug">slug</Label>
              <Input id="slug" name="slug" defaultValue="slug" />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
