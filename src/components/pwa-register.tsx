'use client';

import { useEffect } from 'react';

// Registers the service worker in production only. In development, Next
// serves fresh modules and a worker would only get in the way.
export const PwaRegister = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Nothing to do; the app works without it.
    });
  }, []);
  return null;
};
