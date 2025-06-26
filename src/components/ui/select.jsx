"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDownIcon } from "@heroicons/react/24/outline"

const Select = ({ value, onValueChange, children, ...props }) => {
  return (
    <div className="relative">
      {React.Children.map(children, child => {
        if (child.type === SelectTrigger) {
          return React.cloneElement(child, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
};

const SelectTrigger = React.forwardRef(({ className, children, value, onValueChange, ...props }, ref) => {
  const selectItems = React.Children.toArray(children)
    .find(child => child.type === SelectContent)
    ?.props.children;

  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8",
          className
        )}
        {...props}
      >
        {selectItems}
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50 pointer-events-none" />
    </div>
  );
});
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children, className }) => children

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <option
    ref={ref}
    value={value}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </option>
))
SelectItem.displayName = "SelectItem"

const SelectValue = ({ placeholder }) => (
  <span className="text-muted-foreground">{placeholder}</span>
)

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} 