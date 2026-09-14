import { useEffect, useState } from 'react';
import { localDate } from '@/lib/finance';
export function useToday() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const update = () => setToday(localDate());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  return today;
}
