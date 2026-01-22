'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ToggleGroupContextValue {
  type: 'single' | 'multiple'
  value: string | string[]
  onValueChange: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null)

interface ToggleGroupProps {
  type: 'single' | 'multiple'
  value?: string | string[]
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ type, value, onValueChange, children, className }, ref) => {
    return (
      <ToggleGroupContext.Provider
        value={{
          type,
          value: value ?? (type === 'multiple' ? [] : ''),
          onValueChange: onValueChange ?? (() => {}),
        }}
      >
        <div
          ref={ref}
          className={cn('flex items-center gap-1', className)}
          role="group"
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)
ToggleGroup.displayName = 'ToggleGroup'

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  size?: 'default' | 'sm' | 'lg'
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, value, size = 'default', ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)

    if (!context) {
      throw new Error('ToggleGroupItem must be used within a ToggleGroup')
    }

    const isSelected =
      context.type === 'multiple'
        ? (context.value as string[]).includes(value)
        : context.value === value

    const handleClick = () => {
      context.onValueChange(value)
    }

    const sizeClasses = {
      default: 'h-10 px-3',
      sm: 'h-8 px-2.5',
      lg: 'h-11 px-5',
    }

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        data-state={isSelected ? 'on' : 'off'}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          sizeClasses[size],
          isSelected && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ToggleGroupItem.displayName = 'ToggleGroupItem'

export { ToggleGroup, ToggleGroupItem }
