"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

export function CreateProjectSheet() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    
    // Auto-fill slug logic:
    // Convert to lowercase, replace spaces and non-alphanumeric chars with hyphens
    const generatedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
    
    setSlug(generatedSlug)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 transition-all gap-2 h-11 px-6 rounded-xl self-start md:self-auto">
          <Plus className="h-5 w-5" />
          <span className="font-semibold text-sm">Add Project</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md border-l border-gray-100">
        <SheetHeader className="pb-6 border-b border-gray-50">
          <SheetTitle className="text-xl font-bold text-gray-900">Add Project</SheetTitle>
          <SheetDescription className="text-gray-500">
            Fill in the details below to create a new project workspace.
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-6 py-8">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Project Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Web Designer" 
              value={name}
              onChange={handleNameChange}
              className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-semibold text-gray-700">Slug</Label>
            <Input 
              id="slug" 
              placeholder="e.g. web-designer" 
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="h-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all"
            />
            <p className="text-[11px] text-gray-400 font-medium">
              The slug is used in the project's unique URL and cannot contain spaces.
            </p>
          </div>
        </div>
        
        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-50 bg-white">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-bold shadow-lg shadow-blue-100">
            Create Project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
