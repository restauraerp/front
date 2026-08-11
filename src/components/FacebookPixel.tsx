'use client';

import Script from 'next/script';

/**
 * The Meta pixel, for the demo app only.
 *
 * The demo is where a visitor becomes a Lead, and that Lead has to be reported
 * from the browser as well as the server so Meta can deduplicate the pair. It
 * is not loaded for real restaurants: staff using the till are not an audience,
 * and their working day is not ad measurement.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '';

export default function FacebookPixel() {
  if (!PIXEL_ID) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(PIXEL_ID)});
fbq('track', 'PageView');
      `}
    </Script>
  );
}
