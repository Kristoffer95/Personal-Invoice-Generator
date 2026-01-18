'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { DailyWorkHours } from '@invoice-generator/shared-types'

interface WorkHoursEditorProps {
  periodStart?: string
  periodEnd?: string
  dailyWorkHours: DailyWorkHours[]
  defaultHoursPerDay: number
  onUpdateDay: (date: string, hours: number, notes?: string) => void
  onToggleWorkday: (date: string) => void
  onSetDefaultForPeriod: (startDate: string, endDate: string, defaultHours: number) => void
  onPeriodChange: (start: string, end: string) => void
}

export function WorkHoursEditor({
  periodStart,
  periodEnd,
  dailyWorkHours,
  defaultHoursPerDay,
  onUpdateDay,
  onToggleWorkday,
  onSetDefaultForPeriod,
  onPeriodChange,
}: WorkHoursEditorProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    periodStart ? parseISO(periodStart) : today
  )
  const [localDefaultHours, setLocalDefaultHours] = useState(defaultHoursPerDay)

  const hoursMap = useMemo(() => {
    const map = new Map<string, DailyWorkHours>()
    dailyWorkHours.forEach((d) => map.set(d.date, d))
    return map
  }, [dailyWorkHours])

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleSetPeriodToCurrentMonth = () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    onPeriodChange(start, end)
    onSetDefaultForPeriod(start, end, localDefaultHours)
  }

  const handleSetPeriodTo15th = () => {
    const start = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd')
    const end = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15), 'yyyy-MM-dd')
    onPeriodChange(start, end)
    onSetDefaultForPeriod(start, end, localDefaultHours)
  }

  const handleSetPeriod16thToEnd = () => {
    const start = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 16), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    onPeriodChange(start, end)
    onSetDefaultForPeriod(start, end, localDefaultHours)
  }

  const isInPeriod = (date: Date): boolean => {
    if (!periodStart || !periodEnd) return false
    const dateStr = format(date, 'yyyy-MM-dd')
    return dateStr >= periodStart && dateStr <= periodEnd
  }

  const totalHours = useMemo(() => {
    return dailyWorkHours
      .filter((d) => d.isWorkday && d.hours > 0)
      .reduce((sum, d) => sum + d.hours, 0)
  }, [dailyWorkHours])

  const totalDays = useMemo(() => {
    return dailyWorkHours.filter((d) => d.isWorkday && d.hours > 0).length
  }, [dailyWorkHours])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Work Hours
        </CardTitle>
        <CardDescription>
          Configure working days and hours for the billing period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick period selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Default hours per day:</Label>
            <Input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={localDefaultHours}
              onChange={(e) => setLocalDefaultHours(parseFloat(e.target.value) || 0)}
              className="w-20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSetPeriodTo15th}>
              1st - 15th
            </Button>
            <Button variant="outline" size="sm" onClick={handleSetPeriod16thToEnd}>
              16th - End
            </Button>
            <Button variant="outline" size="sm" onClick={handleSetPeriodToCurrentMonth}>
              Full Month
            </Button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Empty cells for days before the first of the month */}
          {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}

          {monthDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayData = hoursMap.get(dateStr)
            const inPeriod = isInPeriod(day)
            const weekend = isWeekend(day)

            return (
              <div
                key={dateStr}
                className={cn(
                  'relative rounded-md border p-1 transition-colors',
                  inPeriod && 'bg-primary/5 border-primary/30',
                  weekend && !inPeriod && 'bg-muted/50',
                  dayData?.isWorkday === false && 'opacity-50'
                )}
              >
                <div className="text-xs font-medium">{format(day, 'd')}</div>
                {inPeriod && (
                  <div className="mt-1 space-y-1">
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={dayData?.hours ?? 0}
                      onChange={(e) =>
                        onUpdateDay(dateStr, parseFloat(e.target.value) || 0)
                      }
                      className="h-6 px-1 text-xs"
                    />
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={dayData?.isWorkday ?? false}
                        onCheckedChange={() => onToggleWorkday(dateStr)}
                        className="h-3 w-3"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="flex justify-between rounded-lg bg-muted p-4">
          <div>
            <div className="text-sm text-muted-foreground">Working Days</div>
            <div className="text-2xl font-bold">{totalDays}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Hours</div>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
          </div>
        </div>

        {/* Period display */}
        {periodStart && periodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Billing Period: {format(parseISO(periodStart), 'MMM d')} -{' '}
              {format(parseISO(periodEnd), 'MMM d, yyyy')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
