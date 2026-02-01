import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/app/components/dashboard/sidebar"
import { SignOutButton } from "@/app/components/dashboard/sign-out-button"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Fetch user role
    const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    const role = userRoleData?.role || 'warehouse_staff'

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <Sidebar role={role} />
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                    <div className="w-full flex-1">
                        <h1 className="font-semibold text-lg">Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground capitalize">{role}</span>
                        <SignOutButton />
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
