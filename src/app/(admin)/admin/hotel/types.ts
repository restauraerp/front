/** Hotel data, as core-api's Hotel controllers serve it. */

export type Room = { id: number; number: string; floor: string | null; in_service: boolean; notes: string | null };

export type RoomType = {
  id: number;
  name: string;
  description: string | null;
  location: { id: number; name: string } | null;
  max_adults: number;
  max_children: number;
  rate: number;
  weekend_rate: number | null;
  beds: string | null;
  size_sqft: number | null;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  rooms?: Room[];
};

export type Extra = { label: string; amount: number };

export type RoomBookingSummary = {
  id: number;
  status: string;
  next: string[];
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  room_type: { id: number; name: string } | null;
  room: { id: number; number: string } | null;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  source: string;
  total: number;
  paid: number;
  due: number;
};

export type Payment = { id: number; amount: number; method: string; note: string | null; paid_at: string; received_by: string | null };

export type RoomBookingDetail = RoomBookingSummary & {
  location: { id: number; name: string } | null;
  nightly_rates: { date: string; rate: number }[];
  room_amount: number;
  extras: Extra[];
  extras_amount: number;
  discount: number;
  notes: string | null;
  decline_reason: string | null;
  handled_by: string | null;
  handled_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  last_emailed_at: string | null;
  payments: Payment[];
  created_at: string;
};

export type Quote = {
  price: { nights: number; nightly_rates: { date: string; rate: number }[]; room_amount: number; extras_amount: number; discount: number; total: number };
  free: number;
  full_night: string | null;
  warnings: string[];
};

export const PAYMENT_METHODS: Record<string, string> = { cash: 'Cash', bkash: 'bKash', nagad: 'Nagad', card: 'Card', bank: 'Bank transfer' };

export const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-warning',
  Confirmed: 'badge-success',
  'Checked in': 'badge-info',
  'Checked out': 'badge-ghost',
  Cancelled: 'badge-error badge-outline',
  Declined: 'badge-error',
  'No-show': 'badge-neutral',
};

export const money = (n: number) => `৳${(Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return ymd(x); };

export const storageUrl = (p: string) => (/^https?:\/\//.test(p) ? p : `/storage/${p}`);
