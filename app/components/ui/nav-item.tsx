"use client"

import { LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/app/components/ui/button"

interface NavItemProps {
    href: string;
    icon: LucideIcon;
    children: React.ReactNode;
}

export function NavItem({ href, icon: Icon, children }: NavItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href;

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
