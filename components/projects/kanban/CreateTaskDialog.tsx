"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createTask } from "@/app/lib/actions/tasks"
import { toast } from "sonner"

interface CreateTaskDialogProps {
  projectId: string
  userId: string
  defaultStatus: string
}

export function CreateTaskDialog({ projectId, userId, defaultStatus }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")

  const handleSubmit = async () => {
    if (!title) {
      toast.error("Task title is required")
      return
    }

    setLoading(true)
    const result = await createTask({
      title,
      description,
      status: defaultStatus,
      priority,
      projectId,
      userId,
    })

    setLoading(false)
    if (result.success) {
      toast.success("Task created successfully")
      setOpen(false)
      setTitle("")
      setDescription("")
      setPriority("MEDIUM")
    } else {
      toast.error(result.error || "Failed to create task")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white hover:border-gray-100 border border-transparent text-gray-300 transition-all">
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task in the {defaultStatus.toLowerCase().replace('_', ' ')} column.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add some details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="font-bold">
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
