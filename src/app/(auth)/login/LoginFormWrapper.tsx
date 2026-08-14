'use client';

import dynamic from 'next/dynamic';

// ssr: false here prevents server-rendering the form, which eliminates hydration
// mismatches caused by browser extensions (e.g. password managers) injecting DOM
// nodes between SSR and React hydration. Must live in a Client Component.
const LoginForm = dynamic(() => import('./LoginForm'), { ssr: false });

export default function LoginFormWrapper() {
  return <LoginForm />;
}
