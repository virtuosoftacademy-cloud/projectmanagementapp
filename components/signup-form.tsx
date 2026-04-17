'use client'
import { apiClient } from "@/app/lib/apiclient"
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
import { toast } from "sonner"

export type RegisterStatus = {
  error?: string;
  success?: boolean;
}

function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const [state, registerAction, isPending] = useActionState(async (
    prevState: RegisterStatus,
    formData: FormData,
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
      })
      return { success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Registration failed" };
    }
  },
    { error: undefined, success: undefined }
  );
  useEffect(() => {
    if (!state?.success) return;
    toast.success(state.success || "Registration Successfull!")

    const timer = setTimeout(() => {
      router.push("/auth/login");
    }, 200)

    return () => clearTimeout(timer)
  }, [state?.success, router])

  return (
    <>
      <Card {...props}>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerAction}>
            {state?.error && (
              <div className="text-red-700">
                {state.error}
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullname">Full Name</FieldLabel>
                <Input id="fullname" name="name" type="text" placeholder="John Doe" />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="m@example.com"
                />
                {/* <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription> */}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" name="password" type="password" />
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              {/* <Field>
              <FieldLabel htmlFor="confirm-password">
              Confirm Password
              </FieldLabel>
              <Input id="confirm-password" type="password"/>
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field> */}
              <Field>
                <FieldLabel htmlFor="teamCode">Team Code (Optional)</FieldLabel>
                <Input id="teamCode" name="teamCode" type="text" placeholder="Team Code" />
              </Field>
              <FieldGroup>
                <Field>
                  <Button type="submit"
                    disabled={isPending}>{isPending ? "Creating Account..." : "Create Account"}</Button>
                  {/* <Button variant="outline" type="button">
                  Sign up with Google
                  </Button> */}
                  {/* <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="/auth/login">Sign in</a>
                </FieldDescription> */}
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>

        </CardContent>
      </Card>
    </>
  )
}
export { SignupForm }