import { Suspense } from 'react';
import LoginFormWrapper from './LoginFormWrapper';

// LoginFormWrapper uses dynamic() with ssr:false (Client Component) to avoid
// hydration mismatches from browser extension DOM injections.
// Suspense is still required by the App Router for useSearchParams() usage inside.
export default function Login() {
  return (
    <Suspense>
      <LoginFormWrapper />
    </Suspense>
  );
}
