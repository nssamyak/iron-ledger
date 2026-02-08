"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/components/ui/card"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd, Loader2, ShieldCheck } from "lucide-react"
import { ROLE_HIERARCHY, ROLE_NAMES, getAvailableRoles, normalizeRole } from "@/utils/roles"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"

export default function LoginPage() {
    const [isSignUp, setIsSignUp] = useState(false)
    const [step, setStep] = useState<"auth" | "role">("auth")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [availableRoles, setAvailableRoles] = useState<string[]>([])
    const [selectedRole, setSelectedRole] = useState<string>("")
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError || !user) {
            setError(authError?.message || "Login failed")
            setLoading(false)
            return
        }

        // Fetch user's max role
        const { data: urData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()

        let maxRole = 'warehouse_staff'
        if (urData?.role) {
            maxRole = urData.role
        } else {
            // Fallback to employees table if user_roles is not used as expected
            const { data: empData } = await supabase
                .from('employees')
                .select('roles(role_name)')
                .eq('user_id', user.id)
                .maybeSingle()

            if (empData?.roles) {
                const roleName = (empData.roles as any).role_name
                maxRole = normalizeRole(roleName)
            }
        }

        const roles = getAvailableRoles(maxRole)
        if (roles.length <= 1) {
            // Only one role available, set it and proceed
            const roleToSet = roles[0] || 'warehouse_staff'
            await supabase.auth.updateUser({
                data: { active_role: roleToSet }
            })
            router.push("/dashboard")
            router.refresh()
        } else {
            setAvailableRoles(roles)
            setSelectedRole(maxRole) // Default to max role
            setStep("role")
            setLoading(false)
        }
    }

    const handleRoleSelection = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error: updateError } = await supabase.auth.updateUser({
            data: { active_role: selectedRole }
        })

        if (updateError) {
            setError(updateError.message)
            setLoading(false)
        } else {
            router.push("/dashboard")
            router.refresh()
        }
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    active_role: 'warehouse_staff' // Default for new users
                }
            }
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push("/dashboard")
            router.refresh()
        }
    }

    if (step === "role") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="w-full max-w-sm space-y-6">
                    <div className="flex flex-col items-center space-y-2 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <ShieldCheck className="size-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Select Role</h1>
                        <p className="text-sm text-muted-foreground">Select the role you wish to use for this session</p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Session Role</CardTitle>
                            <CardDescription>
                                You can assume any role at or below your assigned level.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRoleSelection} className="space-y-4">
                                <div className="space-y-2">
                                    <Select
                                        value={selectedRole}
                                        onValueChange={setSelectedRole}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map((role) => (
                                                <SelectItem key={role} value={role}>
                                                    {ROLE_NAMES[role] || role}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {error && (
                                    <div className="text-sm text-red-500">
                                        {error}
                                    </div>
                                )}
                                <Button className="w-full" type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Continue to Dashboard
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-sm space-y-6">
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GalleryVerticalEnd className="size-6" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">IronLedger</h1>
                    <p className="text-sm text-muted-foreground">Industrial Inventory Management</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{isSignUp ? "Create Account" : "Welcome back"}</CardTitle>
                        <CardDescription>
                            {isSignUp
                                ? "Enter your details to create a new account"
                                : "Enter your credentials to access your account"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                            {isSignUp && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                    <Input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            {error && (
                                <div className={`text-sm ${error.includes("Check your email") ? "text-green-500" : "text-red-500"}`}>
                                    {error}
                                </div>
                            )}
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSignUp ? "Sign Up" : "Sign In"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <button
                            onClick={() => {
                                setIsSignUp(!isSignUp)
                                setError(null)
                            }}
                            className="text-xs text-muted-foreground hover:underline"
                            type="button"
                        >
                            {isSignUp
                                ? "Already have an account? Sign In"
                                : "Don't have an account? Sign Up"}
                        </button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
