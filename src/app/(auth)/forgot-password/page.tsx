import type { Metadata } from 'next';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset your password | RestoraERP',
  // Nothing here should ever be indexed: it is a credential-recovery form.
  robots: { index: false, follow: false },
};

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
