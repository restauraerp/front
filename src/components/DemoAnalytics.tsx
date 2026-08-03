'use client';

import { useEffect } from 'react';
import { isDemoSession } from '@/lib/demo';

export default function DemoAnalytics() {
  useEffect(() => {
    // Gating on the demo-session cookie rather than a build-time env flag keeps
    // this event tied to actual demo visitors, on any deployment, with no
    // rebuild to toggle.
    if (!isDemoSession()) return;

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
