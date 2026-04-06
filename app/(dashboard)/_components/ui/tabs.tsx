// app/(dashboard)/_components/ui/tabs.tsx

"use client"

import { cn } from "@/lib/utils"
import * as React from "react"

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, defaultValue, value, onValueChange, ...props }, ref) => {
  const [stateValue, setStateValue] = React.useState(defaultValue || "")
  const currentValue = value !== undefined ? value : stateValue
  const handleValueChange = React.useCallback(
    (val: string) => {
      if (onValueChange) {
        onValueChange(val)
      } else {
        setStateValue(val)
      }
    },
    [onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("", className)} {...props} />
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    role="tablist"
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value
  return (
    <button
      ref={ref}
      onClick={(e) => {
        e.preventDefault()
        ctx?.onValueChange(value)
      }}
      type="button"
      role="tab"
      data-state={isActive ? "active" : "inactive"}
      aria-selected={isActive}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "data-[state=inactive]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const isActive = ctx?.value === value
  return (
    <div
      ref={ref}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-0",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, TabsList, TabsTrigger }
