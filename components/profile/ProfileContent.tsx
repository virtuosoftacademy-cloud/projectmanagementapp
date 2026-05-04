"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateProfile } from "@/app/lib/actions/profile"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FolderIcon, CheckCircle2, Clock, ListChecks, Mail, User, DollarSign, Save } from "lucide-react"
import { User as UserType } from "@/app/types"

interface ProfileContentProps {
  user: UserType
  stats: {
    projects: number
    tasks: number
    completed: number
    hoursLogged: number
  }
  projects: any[]
  tasks: any[]
}

export function ProfileContent({ user, stats, projects, tasks }: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [isPending, startTransition] = useTransition()

  const handleUpdate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  // Get initials for avatar fallback
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="space-y-6 mx-auto">
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-none shadow-sm bg-white">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-blue-50">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none w-fit mx-auto md:mx-0">
                  {user.role.toLowerCase()}
                </Badge>
              </div>
              <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FolderIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
              <p className="text-sm text-gray-500 font-medium">Projects</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <ListChecks className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.tasks}</p>
              <p className="text-sm text-gray-500 font-medium">Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500 font-medium">Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.hoursLogged}</p>
              <p className="text-sm text-gray-500 font-medium">Hours Logged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="details" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100/50 p-1 mb-6 border border-gray-200">
          <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Details</TabsTrigger>
          <TabsTrigger value="projects" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Projects</TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 py-4">
              <CardTitle className="text-lg font-bold text-gray-900">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form action={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4" /> Display Name
                  </label>
                  <Input name="name" defaultValue={user.name} className="bg-gray-50 border-gray-200 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="h-4 w-4" /> Email
                  </label>
                  <Input name="email" defaultValue={user.email} disabled className="bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed</p>
                </div>
                {/* <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Hourly Rate (PKR)
                  </label>
                  <Input name="hourlyRate" type="number" defaultValue={user.hourlyRate || 0} className="bg-gray-50 border-gray-200 focus:bg-white" />
                </div> */}
                {/* <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Monthly Hours
                  </label>
                  <Input name="monthlyHours" type="number" defaultValue={user.monthlyHours || 0} className="bg-gray-50 border-gray-200 focus:bg-white" />
                </div> */}
                <div className="md:col-span-2 flex justify-end pt-4 border-t border-gray-100 mt-4">
                  <Button 
                    type="submit" 
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] gap-2"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="border-b border-gray-100 py-4">
              <CardTitle className="text-lg font-bold text-gray-900">My Projects ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {projects.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {projects.map((project) => (
                    <div key={project.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${project.status === 'ACTIVE' ? 'bg-blue-500' : 'bg-green-500'}`} />
                        <div>
                          <h4 className="font-bold text-gray-900">{project.name}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1">{project.description || "No description provided."}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600">
                            {project.status}
                         </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">No projects assigned yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="border-none shadow-sm bg-white">
             <CardHeader className="border-b border-gray-100 py-4">
              <CardTitle className="text-lg font-bold text-gray-900">My Tasks ({tasks.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900">{task.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                           <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-bold uppercase ${task.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">No tasks assigned yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
