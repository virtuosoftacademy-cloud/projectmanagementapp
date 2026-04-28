"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Role } from "@/app/types"
import { inviteMember } from "@/app/lib/actions/team"
import { toast } from "sonner"
import { XIcon } from "lucide-react"

interface InviteMemberProps {
  isOpen: boolean
  onClose: () => void
  teams: any[]
}

export function InviteMember({ isOpen, onClose, teams }: InviteMemberProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>(Role.USER)
  const [teamId, setTeamId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInvite = async () => {
    if (!name || !email) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await inviteMember({ name, email, role, teamId: teamId === "none" ? undefined : teamId || undefined })
      if (result.success) {
        toast.success("Member invited successfully")
        setName("")
        setEmail("")
        setRole(Role.USER)
        setTeamId("")
        onClose()
      } else {
        toast.error(result.error || "Failed to invite member")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 border-none rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-gray-900">Invite Member</DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-400">
                Add a new member to your workspace.
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Name</Label>
              <Input 
                placeholder="Full name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-gray-200 focus-visible:ring-blue-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Email</Label>
              <Input 
                type="email"
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-gray-200 focus-visible:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                    <SelectItem value={Role.MANAGER}>Manager</SelectItem>
                    <SelectItem value={Role.USER}>Member</SelectItem>
                    <SelectItem value={Role.GUEST}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Team (Optional)</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="bg-white border-gray-200">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50/50 p-6 flex justify-end gap-3 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose} className="font-bold text-gray-500 hover:text-gray-700">
            Cancel
          </Button>
          <Button 
            onClick={handleInvite} 
            disabled={isSubmitting}
            className="bg-primary hover:opacity-90 text-primary-foreground font-bold px-8"
          >
            {isSubmitting ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
