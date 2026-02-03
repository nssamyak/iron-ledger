"use client"

import * as React from "react"
import { cn } from "@/app/components/ui/button"

const Dialog = ({ children, open, onOpenChange }: any) => {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            <div className="relative z-50">
                {children}
            </div>
        </div>
    )
}

const DialogContent = ({ className, children }: any) => (
    <div className={cn("bg-background border rounded-2xl shadow-2xl p-6 w-[500px] max-w-[95vw] animate-in fade-in zoom-in-95 duration-200", className)}>
        {children}
    </div>
)

const DialogHeader = ({ className, children }: any) => (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-6", className)}>
        {children}
    </div>
)

const DialogTitle = ({ className, children }: any) => (
    <h3 className={cn("text-lg font-black leading-none tracking-tight uppercase", className)}>
        {children}
    </h3>
)

const DialogDescription = ({ className, children }: any) => (
    <p className={cn("text-sm text-muted-foreground", className)}>
        {children}
    </p>
)

const DialogFooter = ({ className, children }: any) => (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
        {children}
    </div>
)

export {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
}
