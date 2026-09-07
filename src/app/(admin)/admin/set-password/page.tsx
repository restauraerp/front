import { Suspense } from 'react';
import SetPasswordForm from './SetPasswordForm';

/**
 * The form reads ?next with useSearchParams(), which the App Router requires a
 * Suspense boundary around - without one the whole route fails to prerender at
 * build time. Same thin server wrapper as /login/one-time.
 */
export default function SetPassword() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
