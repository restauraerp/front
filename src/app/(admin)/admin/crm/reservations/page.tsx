import { redirect } from 'next/navigation';

/** Table bookings moved to their own page, reachable by front-of-house staff without CRM. */
export default function ReservationsRedirect() {
  redirect('/admin/bookings');
}
