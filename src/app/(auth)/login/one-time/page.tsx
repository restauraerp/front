import { Suspense } from 'react';
import OneTimeLoginForm from './OneTimeLoginForm';

/**
 * The form reads ?token with useSearchParams(), which the App Router requires a
 * Suspense boundary around - without one the whole route opts out of static
 * prerendering. Same thin server wrapper as /login.
 */
export default function OneTimeLogin() {
  return (
    <Suspense>
      <OneTimeLoginForm />
    </Suspense>
  );
}
