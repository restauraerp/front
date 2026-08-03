import { Suspense } from 'react';
import LoginForm from './LoginForm';

/**
 * The form reads ?demo=true with useSearchParams(), which the App Router
 * requires a Suspense boundary around - without one the whole route opts out of
 * static prerendering. Hence this thin server wrapper.
 */
export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
