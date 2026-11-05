'use client';
import Script from 'next/script';
import type { SiteTags } from '@/lib/site/track';

/**
 * A restaurant's own measurement tags on its website and ordering pages:
 * Google Tag Manager, Google Analytics 4, the Meta pixel and Microsoft
 * Clarity, each only when the restaurant has set its id.
 *
 * Never in the editor's preview - an owner editing is not a visitor. The ids
 * are checked against each product's format by core-api before they are
 * stored, so they are safe to place in a script; JSON.stringify still quotes
 * them, so a value could never end the string it sits in.
 */
export default function SiteTracking({ tags }: { tags: SiteTags | null | undefined }) {
  if (!tags) return null;
  const q = JSON.stringify;

  return (
    <>
      {tags.gtm_id && (
        <Script id="site-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${q(tags.gtm_id)});`}
        </Script>
      )}
      {tags.ga4_id && (
        <>
          <Script id="site-ga4-lib" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tags.ga4_id)}`} strategy="afterInteractive" />
          <Script id="site-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${q(tags.ga4_id)});`}
          </Script>
        </>
      )}
      {tags.meta_pixel_id && (
        <Script id="site-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${q(tags.meta_pixel_id)});fbq('track','PageView');`}
        </Script>
      )}
      {tags.clarity_id && (
        <Script id="site-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${q(tags.clarity_id)});`}
        </Script>
      )}
    </>
  );
}
