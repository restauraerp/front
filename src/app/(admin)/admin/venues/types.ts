/** Venue booking data, as core-api's Venues controllers serve it. */

export type Venue = {
  id: number;
  name: string;
  description: string | null;
  location: { id: number; name: string } | null;
  capacity: number | null;
  min_guests: number | null;
  price: number;
  rent_type: 'per_event' | 'per_hour';
  buffer_minutes: number;
  is_active: boolean;
};

export type VenuePackage = {
  id: number;
  name: string;
  description: string | null;
  price_per_person: number;
  min_guests: number | null;
  is_active: boolean;
};

export type Extra = { label: string; amount: number };

export type BookingSummary = {
  id: number;
  status: string;
  next: string[];
  guest_name: string;
  guest_phone: string;
  event_type: string;
  event_title: string | null;
  guests: number;
  hall: { id: number; name: string } | null;
  location: { id: number; name: string } | null;
  date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  total: number;
  paid: number;
  due: number;
};

export type Payment = { id: number; amount: number; method: string; note: string | null; paid_at: string; received_by: string | null };

export type BookingDetail = BookingSummary & {
  package: { id: number | null; name: string; price_per_person: number } | null;
  rent_amount: number;
  food_amount: number;
  extras: Extra[];
  extras_amount: number;
  discount: number;
  notes: string | null;
  source: string;
  decline_reason: string | null;
  handled_by: string | null;
  handled_at: string | null;
  called_at: string | null;
  called_by: string | null;
  payments: Payment[];
  created_at: string;
};

export type Quote = {
  price: { hours: number; rent_amount: number; package_name: string | null; package_price: number; food_amount: number; extras_amount: number; discount: number; total: number };
  clashes: BookingSummary[];
  warnings: string[];
};

export const EVENT_TYPES: Record<string, string> = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  holud: 'Gaye holud',
  aqiqah: 'Aqiqah',
  engagement: 'Engagement',
  anniversary: 'Anniversary',
  corporate: 'Corporate',
  meeting: 'Meeting',
  reunion: 'Reunion',
  other: 'Other',
};

export const PAYMENT_METHODS: Record<string, string> = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', card: 'Card', bank: 'Bank transfer' };

export const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-warning',
  Confirmed: 'badge-success',
  Completed: 'badge-ghost',
  Cancelled: 'badge-error badge-outline',
  Declined: 'badge-error',
};

export const money = (n: number) => `৳${(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const time12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const longDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
