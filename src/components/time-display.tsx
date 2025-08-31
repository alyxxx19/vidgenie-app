'use client';

import { useState, useEffect } from 'react';

export default function TimeDisplay() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.toUTCString().split(' ')[4]; // Extract HH:MM:SS
      setTime(utc);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-xs text-muted-foreground">
      utc: {time}
    </div>
  );
}