'use client'

import { CalendarDays, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import type { ScheduleConfig as ScheduleConfigType, ScheduleFrequency, WorkdayType } from '@invoice-generator/shared-types'

interface ScheduleConfigProps {
  config: ScheduleConfigType
  onUpdate: (updates: Partial<ScheduleConfigType>) => void
  customDates: string[]
  onCustomDatesChange: (dates: string[]) => void
}

export function ScheduleConfig({
  config,
  onUpdate,
  customDates,
  onCustomDatesChange,
}: ScheduleConfigProps) {
  const handleFrequencyChange = (value: ScheduleFrequency) => {
    onUpdate({ frequency: value })
  }

  const handleWorkdayTypeChange = (value: WorkdayType) => {
    onUpdate({ workdayType: value })
  }

  const handleCalendarSelect = (dates: Date[] | undefined) => {
    if (dates) {
      onCustomDatesChange(dates.map((d) => format(d, 'yyyy-MM-dd')))
    } else {
      onCustomDatesChange([])
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Invoice Schedule
        </CardTitle>
        <CardDescription>
          Configure when to create invoices. The invoice will not auto-generate - you&apos;ll be reminded when it&apos;s time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Invoice Frequency</Label>
          <RadioGroup
            value={config.frequency}
            onValueChange={handleFrequencyChange}
            className="grid gap-2"
          >
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="EVERY_15TH" id="every-15th" />
              <Label htmlFor="every-15th" className="flex-1 cursor-pointer">
                <div className="font-medium">Every 15th</div>
                <div className="text-sm text-muted-foreground">
                  Generate invoice for days 1-15 of each month
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="EVERY_LAST_DAY" id="every-last-day" />
              <Label htmlFor="every-last-day" className="flex-1 cursor-pointer">
                <div className="font-medium">Every Last Day</div>
                <div className="text-sm text-muted-foreground">
                  Generate invoice for days 16-end of each month
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="BOTH_15TH_AND_LAST" id="both" />
              <Label htmlFor="both" className="flex-1 cursor-pointer">
                <div className="font-medium">Both 15th and Last Day</div>
                <div className="text-sm text-muted-foreground">
                  Generate two invoices per month (semi-monthly)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="CUSTOM" id="custom" />
              <Label htmlFor="custom" className="flex-1 cursor-pointer">
                <div className="font-medium">Custom Dates</div>
                <div className="text-sm text-muted-foreground">
                  Select specific dates from the calendar
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Custom Date Picker */}
        {config.frequency === 'CUSTOM' && (
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Dates</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !customDates.length && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDates.length > 0
                    ? `${customDates.length} dates selected`
                    : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={customDates.map((d) => parseISO(d))}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {customDates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customDates.slice(0, 10).map((date) => (
                  <span
                    key={date}
                    className="rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    {format(parseISO(date), 'MMM d')}
                  </span>
                ))}
                {customDates.length > 10 && (
                  <span className="rounded-md bg-muted px-2 py-1 text-xs">
                    +{customDates.length - 10} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Workday Type Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Days to Include</Label>
          <RadioGroup
            value={config.workdayType}
            onValueChange={handleWorkdayTypeChange}
            className="grid gap-2"
          >
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="WEEKDAYS_ONLY" id="weekdays" />
              <Label htmlFor="weekdays" className="flex-1 cursor-pointer">
                <div className="font-medium">Weekdays Only</div>
                <div className="text-sm text-muted-foreground">
                  Monday through Friday (excludes weekends)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="ALL_DAYS" id="all-days" />
              <Label htmlFor="all-days" className="flex-1 cursor-pointer">
                <div className="font-medium">All Days</div>
                <div className="text-sm text-muted-foreground">
                  Every day including weekends
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50">
              <RadioGroupItem value="CUSTOM" id="custom-days" />
              <Label htmlFor="custom-days" className="flex-1 cursor-pointer">
                <div className="font-medium">Custom Selection</div>
                <div className="text-sm text-muted-foreground">
                  Manually select working days in the calendar
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  )
}
