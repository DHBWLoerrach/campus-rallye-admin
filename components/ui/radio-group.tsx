'use client';

import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive className={cn('grid gap-2', className)} {...props} />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof Radio.Root>) {
  return (
    <Radio.Root
      className={cn(
        'aspect-square h-4 w-4 rounded-full border border-input text-muted-foreground ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:border-primary data-checked:text-primary/80',
        className
      )}
      {...props}
    >
      <Radio.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </Radio.Indicator>
    </Radio.Root>
  );
}

export { RadioGroup, RadioGroupItem };
