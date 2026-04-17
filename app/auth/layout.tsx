'use client'
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation"

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
    return (
        <div className="min-h-screen flex items-center justify-center flex-col bg-gray-100 px-20">
            <div className="pt-8 self-start">
            <Button onClick={() => router.push("/")} >
                <ArrowLeft />
            </Button>
            </div>
            {children}
        </div>
    )
}

export default AuthLayout;