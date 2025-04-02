'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

// This component safely formats and displays a date string on the client
// It avoids React hydration errors caused by mismatches between
// server-rendered and client-rendered content.
export default function FormattedEndTime({ value }: { value: string }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      setText(format(parsed, "EEE dd.MM.yy HH:mm 'Uhr'", { locale: de }));
    }
  }, [value]);

  return <span>{text || 'Endzeitpunkt fehlt'}</span>;
}
