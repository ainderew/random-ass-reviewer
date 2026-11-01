'use client';
import { useReducedMotion } from '@/lib/use-reduced-motion';
export function useSpringPop(): { className: string } {
  const reduced = useReducedMotion();
  return { className: reduced ? 'fade-in' : 'spring-pop' };
}
