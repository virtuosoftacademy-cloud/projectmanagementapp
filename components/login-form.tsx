'use client'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { apiClient } from "@/app/lib/apiclient"
import { toast } from "sonner"

export type LoginStatus = {
  error?: string;
  success?: boolean;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [state, loginAction, isPending] = useActionState(async (
    prevState: LoginStatus,
    formData: FormData,
  ): Promise<LoginStatus> => {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await apiClient.Login(email, password)
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Login failed" };
    }
  },
    { error: undefined, success: undefined }
  );

  useEffect(() => {
    if (!state?.success) return;
    toast.success("Login Successfull!")

    router.push("/");

  }, [state?.success, router])

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction}>
            {state?.error && (
              <div className="text-red-700">
                {state.error}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  name="email"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {/* <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a> */}
                </div>
                <Input id="password" type="password" required name="password" />
              </Field>
              <Field>
                <Button type="submit" disabled={isPending}>{isPending ? "Logining in..." : "Login"}</Button>
                {/* <Button variant="outline" type="button">
                  Login with Google
                </Button>
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription> */}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
