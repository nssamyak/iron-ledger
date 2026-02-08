import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/app/components/dashboard/sidebar"
import { SignOutButton } from "@/app/components/dashboard/sign-out-button"
import { ROLE_HIERARCHY, ROLE_NAMES, normalizeRole } from "@/utils/roles"

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

    // Prioritize active_role from user metadata (set during login)
    let role = user.user_metadata?.active_role

    // If no active_role in metadata, fetch from DB
    if (!role) {
        console.log("No active_role in metadata, fetching from DB...")

        // 1. Get mapping from user_roles
        const { data: urData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()

        if (urData?.role) {
            role = urData.role
        } else {
            // 2. Fallback to employees table
            const { data: employeeData } = await supabase
                .from('employees')
                .select('role_id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (employeeData?.role_id) {
                const { data: roleRec } = await supabase
                    .from('roles')
                    .select('role_name')
                    .eq('role_id', employeeData.role_id)
                    .maybeSingle()

                role = normalizeRole(roleRec?.role_name)
            }
        }
    }

    // Final fallback
    if (!role) {
        role = 'warehouse_staff'
    }

    console.log(`DASHBOARD LOAD: User ID = ${user.id}, Active Role = ${role}`)

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <Sidebar role={role} />
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
                    <div className="w-full flex-1">
                        <h1 className="font-semibold text-lg">Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground capitalize">
                            {ROLE_NAMES[role] || role.replace(/_/g, ' ')}
                        </span>
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
