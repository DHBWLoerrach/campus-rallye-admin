'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DateTimePickerProps {
  value?: Date;
  onChange?: (value: Date | undefined) => void;
  hourCycle?: 12 | 24;
  locale?: React.ComponentProps<typeof Calendar>['locale'];
  className?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toTimeString(date?: Date): string {
  if (!date) return '00:00';
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function parseTimeString(s: string): { h: number; m: number } | null {
  // Accept HH:mm (ignore seconds if provided)
  const parts = s.split(':').map((p) => p.trim());
  if (parts.length < 2) return null;
  const [h, m] = [Number(parts[0]), Number(parts[1])];
  if ([h, m].some((n) => Number.isNaN(n))) return null;
  if (h < 0 || h > 23) return null;
  if (m < 0 || m > 59) return null;
  return { h, m };
}

function combine(datePart?: Date, timeStr?: string): Date | undefined {
  if (!datePart && !timeStr) return undefined;
  const base = datePart ? new Date(datePart) : new Date();
  const t = parseTimeString(timeStr ?? '00:00') ?? { h: 0, m: 0 };
  const out = new Date(base);
  out.setHours(t.h, t.m, 0, 0);
  return out;
}

export function DateTimePicker({
  value,
  onChange,
  hourCycle = 24,
  locale,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [datePart, setDatePart] = React.useState<Date | undefined>(value);
  const [timeStr, setTimeStr] = React.useState<string>(toTimeString(value));

  // Keep internal state in sync when parent value changes
  React.useEffect(() => {
    setDatePart(value);
    setTimeStr(toTimeString(value));
  }, [value]);

  const display = React.useMemo(() => {
    if (!datePart) return 'Datum wählen';
    const fmt =
      hourCycle === 24 ? 'd. MMMM yyyy HH:mm' : 'd. MMMM yyyy hh:mm a';
    try {
      return `${format(combine(datePart, timeStr)!, fmt, {
        locale: locale as any,
      })}`;
    } catch {
      // Fallback if format/locale fails for any reason
      return `${datePart.toLocaleDateString()} ${timeStr}`;
    }
  }, [datePart, timeStr, hourCycle, locale]);

  function handleDateSelect(date: Date | undefined) {
    setDatePart(date);
    if (onChange) onChange(combine(date, timeStr));
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setTimeStr(next);
    if (onChange) onChange(combine(datePart, next));
  }

  // split time into parts for segmented inputs
  const { h, m } = React.useMemo(() => {
    const t = parseTimeString(timeStr) ?? { h: 0, m: 0 };
    return t;
  }, [timeStr]);

  function setTimePart(part: 'h' | 'm', val: number) {
    const clamp = (x: number, min: number, max: number) =>
      Math.max(min, Math.min(max, Math.trunc(x)));
    const HMAX = hourCycle === 24 ? 23 : 12;
    let nh = h,
      nm = m;
    if (part === 'h') nh = clamp(val, 0, HMAX);
    if (part === 'm') nm = clamp(val, 0, 59);
    const next = `${pad2(nh)}:${pad2(nm)}`;
    setTimeStr(next);
    if (onChange) onChange(combine(datePart, next));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-10 justify-start font-normal min-w-0', className)}
        >
          <CalendarIcon className="mr-2 size-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {datePart ? display : 'Datum & Zeit wählen'}
          </span>
          <ChevronDownIcon className="ml-auto size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <div className="p-2">
          <Calendar
            mode="single"
            selected={datePart}
            captionLayout="dropdown"
            hideNavigation
            onSelect={(d) => handleDateSelect(d)}
            locale={locale as any}
          />
        </div>
        <div className="border-t p-3 flex items-center justify-center gap-2">
          <Clock className="size-4 opacity-70" />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={hourCycle === 24 ? 23 : 12}
            value={pad2(h)}
            onChange={(e) => setTimePart('h', Number(e.target.value))}
            className="w-14 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Stunde"
          />
          <span className="select-none">:</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={pad2(m)}
            onChange={(e) => setTimePart('m', Number(e.target.value))}
            className="w-14 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Minute"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
