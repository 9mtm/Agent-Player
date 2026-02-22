'use client';
import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

// Simple manual Dialog implementation to replace Radix UI dependency

interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}



// ... Context ...
const DialogContext = React.createContext<{ open: boolean; setOpen: (o: boolean) => void } | null>(null);

export function DialogRoot({ open, onOpenChange, children }: any) {
    return (
        <DialogContext.Provider value={{ open: open || false, setOpen: onOpenChange || (() => { }) }}>
            {children}
        </DialogContext.Provider>
    );
}

// ... Re-export as Dialog to match usage ...
// But for now, let's just make SkillRunner assume manual control and modify SkillRunner to not use Trigger/Content subcomponents if possible?
// OR, implement full context.

export function DialogContent({ className, children }: any) {
    const ctx = React.useContext(DialogContext);
    if (!ctx?.open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
            <div
                className="fixed inset-0 bg-black/80 transition-opacity"
                onClick={() => ctx.setOpen(false)}
            />
            <div className={cn("relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg", className)}>
                {children}
                <button
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    onClick={() => ctx.setOpen(false)}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
            </div>
        </div>
    )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex flex-col space-y-1.5 text-center sm:text-left",
                className
            )}
            {...props}
        />
    )
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
                className
            )}
            {...props}
        />
    )
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                "text-lg font-semibold leading-none tracking-tight",
                className
            )}
            {...props}
        />
    )
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
}

// Actual export that matches imports
export { DialogRoot as Dialog }

export function DialogTrigger({ className, children, asChild }: any) {
    const ctx = React.useContext(DialogContext);
    const child = asChild ? React.Children.only(children) : <button className={className}>{children}</button>;

    return React.cloneElement(child, {
        onClick: (e: any) => {
            child.props.onClick?.(e);
            ctx?.setOpen(true);
        }
    });
}
