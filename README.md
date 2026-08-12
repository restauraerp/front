This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Analytics

This app can load Google Tag Manager (and GA4 through it), the Meta pixel, and
report a demo Lead after 60 seconds. All three are wrapped in `AnalyticsGate`,
which allows them only when **both** conditions hold:

| Condition | Meaning |
| --- | --- |
| It is a **demo session** | The `demo_session` cookie is set — see below |
| It is **not our own browsing** | The `isdev` exclusion — see below |

### Real restaurants are never tracked

This app is a restaurant's own ERP. Staff ringing up orders on the till are not
an audience, their working day is not ad measurement, and a paying customer's
storefront traffic is not ours to report. Only the demo is marketing, so only
the demo is measured.

> This used to be a comment rather than code. `FacebookPixel`'s docblock has
> always claimed to be demo-only, while the component checked nothing but
> whether a pixel ID was configured — and the root layout loaded GTM on the sole
> condition that an ID existed. **Every real restaurant was reported to GA4 and
> Meta.** The rule is now enforced in `AnalyticsGate`, in one place, rather than
> restated as intent in three.

### The 60-second demo Lead

`DemoAnalytics` reports a Lead once a demo visitor has stayed 60 seconds. It is
guarded by a `demo_lead_reported` cookie scoped to the demo visit (24h, the same
life as `demo_session`), so the event means **once per demo visit** and is shared
across tabs.

Two things about that guard are load-bearing:

- **It is re-checked inside the timeout, not only at mount.** The old version
  tested it at mount and set it 60 seconds later, leaving a window in which it
  was not yet set — so a second tab opened inside that window passed the mount
  check too and both timers reported. Every other condition in the callback was
  re-evaluated; the one the guard depended on was not.
- **It is claimed before the reporting work**, so two timers arriving together
  cannot both get past the check.

It also used to be `localStorage`, which never expires. That version managed to
both over-report (the race above) and under-report: once a browser had reported,
a genuine second demo visit months later went uncounted.

**GTM does not multiply anything.** The container's trigger matches
`demo_checked_over_60_seconds` exactly and fires one GA4 Event tag, so anything
arriving in GA4 more than once was pushed more than once from here. The tag is
set to *Once per page* as a backstop only.

## Excluding your own visits

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

`<html data-analytics="…">` names the reason, and a matching `console.info` line
explains it:

| Attribute | Meaning |
| --- | --- |
| *absent* | Tracking is running — a demo visit, not excluded |
| `dev-traffic` | Your `isdev` marking is in force |
| `not-a-demo-session` | A real restaurant. Correct and expected, not a fault |

The distinction matters: silence on a real restaurant is the design, while the
same silence on a demo visit is a bug. Note `dev-traffic` wins when both apply,
so to check the demo gating you must first turn the header off.

**Testing two identities at once.** `127.0.0.1:3029` is the same dev server as
`localhost:3029` but a separate origin with its own cookie jar, which makes it a
second, independent browser identity — handy when your `isdev` header is scoped
to `localhost` and would otherwise mask everything. `allowedDevOrigins` in
`next.config.ts` exists for this: without it Next blocks its own dev resources
cross-origin, and a blocked HMR request leaves the page **loaded but never
hydrated** — React starts, effects never run, and nothing in the console says
why. That failure looks exactly like a broken component.

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
