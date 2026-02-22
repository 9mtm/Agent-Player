"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{ value: string; onValueChange: (value: string) => void } | null>(null)

const Tabs = React.forwardRef<HTMLDivElement, any>(({ className, defaultValue, value: controlled, onValueChange, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
    const isControlled = controlled !== undefined
    const value = isControlled ? controlled : uncontrolled

    const handleValueChange = React.useCallback((val: string) => {
        if (!isControlled) setUncontrolled(val)
        onValueChange?.(val)
    }, [isControlled, onValueChange])

    return (
        <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
            <div ref={ref} className={cn("", className)} {...props} />
        </TabsContext.Provider>
    )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, any>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, any>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value
    return (
        <button
            ref={ref}
            className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50", isActive && "bg-background text-foreground shadow", className)}
            onClick={() => context?.onValueChange(value)}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, any>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    if (context?.value !== value) return null
    return <div ref={ref} className={cn("mt-2", className)} {...props} />
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
