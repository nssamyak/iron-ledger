"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    GalleryVerticalEnd,
    LineChart,
    MessageSquare,
    TableProperties
} from "lucide-react"
import { cn } from "@/app/components/ui/button"

interface SidebarProps {
    role: string
}

export function Sidebar({ role }: SidebarProps) {
    const pathname = usePathname()

    useEffect(() => {
        const checkUser = async () => {
            const { createClient } = await import("@/utils/supabase/client")
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Fetch role_id for logging
                const { data: empData } = await supabase
                    .from('employees')
                    .select('role_id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                console.log(`userID: ${user.id} role_id: ${empData?.role_id}`)
            }
        }
        checkUser()
    }, [])

    const NavItem = ({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) => {
        const isActive = pathname === href
        return (
            <Link
                href={href}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-primary",
                    isActive ? "bg-muted text-primary" : "text-muted-foreground"
                )}
            >
                <Icon className="h-4 w-4" />
                {children}
            </Link>
        )
    }

    return (
        <div className="hidden border-r bg-muted/40 lg:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-6">
                    <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
                        <GalleryVerticalEnd className="h-6 w-6" />
                        <span>IronLedger</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-4 text-sm font-medium">
                        <NavItem href="/dashboard" icon={LayoutDashboard}>
                            Dashboard
                        </NavItem>
                        <NavItem href="/dashboard/chat" icon={MessageSquare}>
                            NLP Assistant
                        </NavItem>
                        <NavItem href="/dashboard/inventory" icon={Package}>
                            Inventory
                        </NavItem>

                        {/* Navigation restricted for Sales Representatives */}
                        {role !== 'sales_representative' && (
                            <>
                                <NavItem href="/dashboard/orders" icon={ShoppingCart}>
                                    Orders
                                </NavItem>
                                <NavItem href="/dashboard" icon={LineChart}>
                                    Analytics
                                </NavItem>
                                {(role === 'admin' || role === 'manager') && (
                                    <NavItem href="/dashboard/employees" icon={Users}>
                                        Employee Stats
                                    </NavItem>
                                )}
                            </>
                        )}

                        {/* Admin Only Links */}
                        {role === 'admin' && (
                            <>
                                <div className="mt-4 mb-2 px-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                    Administrative
                                </div>
                                <NavItem href="/dashboard/admin/tables" icon={TableProperties}>
                                    Table Management
                                </NavItem>
                                <NavItem href="/dashboard/admin/users" icon={Users}>
                                    User Management
                                </NavItem>
                                <NavItem href="/dashboard/settings" icon={Settings}>
                                    Settings
                                </NavItem>
                            </>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    )
}
