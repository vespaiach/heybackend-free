
import { LoginForm } from "@/app/login/_components/login-form"
import Logo from "@/components/logo"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Logo className="h-4 w-4" />
          </div>
          HeyBackend
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
