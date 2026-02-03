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

    console.log("DASHBOARD LOAD: User ID =", user.id)

    // 1. Get mapping from user_roles (User suggestion: user_id -> emp_id)
    const { data: urData } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    const empIdFromUR = (urData as any)?.emp_id

    // 2. Get employee record (using emp_id if found, else falling back to user_id)
    let employeeData = null
    if (empIdFromUR) {
        const { data: e } = await supabase
            .from('employees')
            .select('role_id')
            .eq('e_id', empIdFromUR)
            .maybeSingle()
        employeeData = e
    } else {
        const { data: e } = await supabase
            .from('employees')
            .select('role_id')
            .eq('user_id', user.id)
            .maybeSingle()
        employeeData = e
    }

    // 3. Resolve role name from roles table
    let dbRoleName = null
    if (employeeData?.role_id) {
        const { data: roleRec } = await supabase
            .from('roles')
            .select('role_name')
            .eq('role_id', employeeData.role_id)
            .maybeSingle()
        dbRoleName = roleRec?.role_name
    }

    // Role mapping logic
    let role = 'warehouse_staff'
    if (dbRoleName === 'Administrator') {
        role = 'admin'
    } else if (dbRoleName === 'Warehouse Manager') {
        role = 'manager'
    } else if (dbRoleName) {
        role = dbRoleName.toLowerCase().replace(/ /g, '_')
    }

    // Console log for debugging
    console.log(`userID: ${user.id} role_id: ${employeeData?.role_id}`)

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
