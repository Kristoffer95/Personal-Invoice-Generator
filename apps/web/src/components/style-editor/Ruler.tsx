'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface RulerProps {
  orientation: 'horizontal' | 'vertical'
  length: number // Length in points
  scale: number // Zoom scale
}

export function Ruler({ orientation, length, scale }: RulerProps) {
  const isHorizontal = orientation === 'horizontal'

  // Generate tick marks - major every 50 points, minor every 10 points
  const ticks = useMemo(() => {
    const result: { position: number; isMajor: boolean; label?: string }[] = []
    const step = 10 // Minor tick every 10 points
    const majorStep = 50 // Major tick every 50 points

    for (let i = 0; i <= length; i += step) {
      const isMajor = i % majorStep === 0
      result.push({
        position: i,
        isMajor,
        label: isMajor ? String(i) : undefined,
      })
    }

    return result
  }, [length])

  const scaledLength = length * scale
  const rulerThickness = 20

  return (
    <div
      className={cn(
        'relative bg-muted/50 select-none',
        isHorizontal ? 'h-5' : 'w-5'
      )}
      style={{
        [isHorizontal ? 'width' : 'height']: scaledLength,
      }}
    >
      {/* Tick marks and labels */}
      {ticks.map((tick) => {
        const position = tick.position * scale
        const tickLength = tick.isMajor ? 12 : 6

        return (
          <div key={tick.position}>
            {/* Tick mark */}
            <div
              className={cn(
                'absolute bg-border',
                isHorizontal ? 'bottom-0' : 'right-0'
              )}
              style={{
                [isHorizontal ? 'left' : 'top']: position,
                [isHorizontal ? 'width' : 'height']: 1,
                [isHorizontal ? 'height' : 'width']: tickLength,
              }}
            />

            {/* Label for major ticks */}
            {tick.label && (
              <span
                className={cn(
                  'absolute text-[9px] text-muted-foreground',
                  isHorizontal ? 'top-0' : 'left-0'
                )}
                style={{
                  [isHorizontal ? 'left' : 'top']: position + 2,
                  ...(isHorizontal ? {} : {
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }),
                }}
              >
                {tick.label}
              </span>
            )}
          </div>
        )
      })}

      {/* Corner piece (only for horizontal ruler) */}
      {isHorizontal && (
        <div
          className="absolute -left-5 top-0 h-5 w-5 bg-muted/50 border-r border-b border-border"
        />
      )}
    </div>
  )
}
