This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Analytics, and excluding your own visits

This app loads Google Tag Manager (and GA4 through it), the Meta pixel, and
reports a demo Lead after 60 seconds. All three are wrapped in `AnalyticsGate`,
so our own browsing stays out of the numbers.

**Send a request header** from the machine you browse from, using a browser
extension such as ModHeader. Works the same locally and in production.

| Request carries | Effect |
| --- | --- |
| `isdev: true` | Suppress, and mark the browser with an `isdev` cookie (1 year) |
| `isdev: false` | Resume, and **clear** the cookie |
| Neither | Fall back to whatever the cookie says |

`true`, `1`, `yes` and `on` all count, any case. Anything unrecognised means
"no", so a typo fails towards counting a real visitor rather than dropping one.

**The cookie is the part that matters here.** A header only exists on the
document request, and this is a single-page app — every route change after that
is client-side with no request for a header to ride on. `src/proxy.ts` turns the
header into a cookie; the components read the cookie.

### Confirming it works

- `<html data-analytics="suppressed">`
- a `console.info` line saying the exclusion is in force

If neither appears, check the extension is attaching the header to this origin.

### Two things worth knowing before you change this

**`AnalyticsGate` assumes *suppressed* on the server.** It has no cookie to read
there, and the two guesses are not symmetrical: guessing "tracked" puts the GTM
and pixel snippets into the initial HTML where they run before any client code,
so the page view is already sent by the time the browser could correct it —
the feature would do nothing. Guessing "suppressed" only delays the tags until
hydration, which they already wait for (`afterInteractive`).

**It is a client component on purpose.** Reading `cookies()` in the root layout
would be a smaller change and the wrong one: it opts *every route in the app*
into dynamic rendering, so the whole storefront would lose static generation to
support a developer-only flag.

**`DemoAnalytics` is inside the gate**, which also stops the *server* half of the
demo Lead: it is what calls core-api, which relays to the website's Conversions
API. Not calling it is what makes that stop at source, with nothing to thread
through core-api.

| Concern | File |
| --- | --- |
| Header names, values, cookie reader | `src/lib/devTraffic.ts` |
| Header → cookie | `src/proxy.ts` |
| The gate | `src/components/AnalyticsGate.tsx` |

The `website` implements the same header and cookie contract in Laravel
(`App\Support\DevTraffic`), and its README carries the fuller explanation.
**Keep the two in step** — one feature, two implementations, and a rename on one
side silently un-excludes the other.

> `src/proxy.ts` matches **every** page request. It used to match only
> `/admin/:path*`, `/login` and `/register`, which was enough when its only job
> was guarding admin routes. It is not enough for this: a visit that started on
> the storefront was never seen, so the exclusion appeared to work only
> sometimes, depending on which page you opened first.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
