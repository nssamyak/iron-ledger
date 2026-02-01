"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/app/components/ui/button"

const SelectContext = React.createContext<any>(null)

const Select = ({ children, value, onValueChange }: any) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative inline-block w-full" ref={containerRef}>
                {children}
            </div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = ({ className, children }: any) => {
    const { open, setOpen, value } = React.useContext(SelectContext)
    return (
        <div
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer overflow-hidden",
                className
            )}
        >
            <div className="truncate mr-2">
                {children}
            </div>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
        </div>
    )
}

const SelectValue = ({ placeholder, children }: any) => {
    // We strictly use the children passed in from the trigger
    // which contains the resolved name, or fall back to placeholder.
    // We NEVER show the raw 'value' from context here.
    return <span>{children || placeholder}</span>
}

const SelectContent = ({ className, children }: any) => {
    const { open } = React.useContext(SelectContext)
    if (!open) return null

    return (
        <div
            className={cn(
                "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                className
            )}
        >
            {children}
        </div>
    )
}

const SelectItem = ({ className, children, value: itemValue }: any) => {
    const { value, onValueChange, setOpen } = React.useContext(SelectContext)
    const isSelected = String(value) === String(itemValue)

    return (
        <div
            onClick={() => {
                onValueChange(itemValue)
                setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer truncate",
                isSelected && "bg-accent text-accent-foreground font-bold",
                className
            )}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {isSelected && <Check className="h-4 w-4" />}
            </span>
            {children}
        </div>
    )
}

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
}
