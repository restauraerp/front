'use client';

import { useEffect } from 'react';

export default function DemoAnalytics() {
  useEffect(() => {
    // Check if we are in demo mode
    const isDemo = process.env.NEXT_PUBLIC_IS_DEMO === 'true' || process.env.NEXT_PUBLIC_IS_DEMO === '"true"';
    
    if (!isDemo) return;

    // Trigger the GTM event after 60 seconds
    const timer = setTimeout(() => {
      // @ts-ignore - dataLayer is injected by GTM snippet
      window.dataLayer = window.dataLayer || [];
      // @ts-ignore
      window.dataLayer.push({
        event: 'demo_checked_over_60_seconds'
      });
      console.log('GTM Event Triggered: demo_checked_over_60_seconds');
    }, 60000); // 60 seconds = 60000 ms

    return () => clearTimeout(timer);
  }, []);

  return null;
}
