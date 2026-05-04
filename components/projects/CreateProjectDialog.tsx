"use client"

import { useState } from "react"
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
import { Plus, Check, CalendarIcon, PlusCircle } from "lucide-react"
import { createProject } from "@/app/lib/actions/projects"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Role, Team, User } from "@/app/types"

const COLORS = [
  "var(--primary)", // Primary
  "#22c55e", // Green
  "#eab308", // Yellow
  "#ef4444", // Red
  "#a855f7", // Purple
  "#06b6d4", // Cyan
]

interface CreateProjectDialogProps {
  workspaceId: string
  showButton?: boolean
  users: User[];
  teams: Team[];
}


export function CreateProjectDialog({ workspaceId, teams=[], users=[], showButton }: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("PLANNING")
  const [color, setColor] = useState(COLORS[0])
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const handleSubmit = async () => {
    if (!name) {
      toast.error("Project name is required")
      return
    }

    setLoading(true)
    const result = await createProject({
      name,
      description,
      status,
      color,
      startDate,
      endDate,
      workspaceId,
      memberIds: selectedMembers,
    })

    setLoading(false)
    if (result.success) {
      toast.success("Project created successfully")
      // Reset form
      setName("")
      setDescription("")
      setStatus("PLANNING")
      setColor(COLORS[0])
      setStartDate("")
      setEndDate("")
      setSelectedMembers([])
    } else {
      toast.error(result.error || "Failed to create project")
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }
  // console.log("Team members in CreateProjectDialog:", users.length)
  return (
    <Dialog>
      <DialogTrigger asChild>
        {showButton === true ?
          <Button>
            <Plus className="h-4 w-4" />
            <span className="text-sm">New Project</span>
          </Button>
          :
          <div>
            <PlusCircle className="cursor-pointer size-4 mr-2" />
          </div>
        }

      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Project</DialogTitle>
          <DialogDescription>
            Add a new project to your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Marketing Site"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Color</Label>
              <div className="flex items-center gap-2 h-10">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="h-3 w-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-semibold">Start Date</Label>
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  className="pl-10"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-semibold">End Date</Label>
              <div className="relative">
                <Input
                  id="endDate"
                  type="date"
                  className="pl-10"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Members</Label>
            <div className="grid grid-cols-2 gap-3 border rounded-xl p-4 bg-gray-50/50">
              {users.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={member.id}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <Label
                    htmlFor={member.id}
                    className="text-sm cursor-pointer"
                  >

                    <span key={member.id}>{member.name}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="space-x-1">
          <DialogClose className="px-4 py-2 bg-accent rounded-md border" >
            Cancel
          </DialogClose>
          <Button
            onClick={handleSubmit}
          >
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
