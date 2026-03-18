import { login, signup } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login / Sign Up</CardTitle>
          <CardDescription>
            Enter your email below to log into your account or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <Button formAction={login} className="w-full">
                Log in
              </Button>
              <Button formAction={signup} variant="outline" className="w-full">
                Sign up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
