'use client';

import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// Format on the client while keeping a stable server snapshot to avoid
// hydration warnings from timezone differences.
export default function FormattedEndTime({ value }: { value: string }) {
  const text = useSyncExternalStore(
    () => () => {},
    () =>
      value
        ? format(new Date(value), "EEE dd.MM.yy HH:mm 'Uhr'", { locale: de })
        : '',
    () => ''
  );

  return <span>{text || 'Endzeitpunkt fehlt'}</span>;
}
