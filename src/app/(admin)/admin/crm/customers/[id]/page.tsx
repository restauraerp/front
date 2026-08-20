'use client';
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Banknote, Clock, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useReport } from '@/hooks/useReport';
import { SettleDueModal } from '@/components/orders/SettleDueModal';

const money = (value: unknown) =>
  `৳${Number(value ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  tier?: string | null;
  loyalty_points?: number | null;
  organization?: { name: string } | null;
}

interface OrdersPage {
  data: Order[];
  from: number | null;
  to: number | null;
  total: number;
  last_page: number;
  /** Across every due order of theirs, not just this page of them. */
  outstanding?: { orders: number; amount: number };
}

interface Order {
  id: number;
  created_at: string;
  status: string;
  status_label?: string;
  payment_status?: string | null;
  order_type?: string | null;
  total: string | number;
  items?: unknown[];
  amount_outstanding?: number | null;
  due_note?: string | null;
}

/**
 * How a payment state reads on screen.
 *
 * Three states, not two: "due" is money the restaurant agreed to collect later
 * and is chasing, which is a different thing from "unpaid" - a bill nobody has
 * settled up yet. The same distinction the orders screen makes.
 */
const paymentBadge = (status?: string | null): { className: string; label: string } => {
  if (status === 'paid') return { className: 'badge-success text-white', label: 'Paid' };
  if (status === 'due') return { className: 'badge-warning', label: 'Due' };
  return { className: 'badge-error text-white', label: 'Unpaid' };
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [page, setPage] = useState(1);
  /** The due order being collected against, if any. */
  const [settlingOrder, setSettlingOrder] = useState<Order | null>(null);

  // useReport rather than a hand-rolled effect: it aborts the in-flight
  // request when the page changes, so a slow response for page 2 cannot
  // overwrite a fast one for page 3, and it clears the old rows during render
  // so the table never shows one page's orders under another page's counter.
  const customerState = useReport<Customer>(`/customers/${id}`, {});
  const ordersState = useReport<OrdersPage>(`/customers/${id}/orders`, { page });

  const customer = customerState.data;
  const orders = ordersState.data?.data ?? [];
  const meta = ordersState.data
    ? {
        from: ordersState.data.from ?? null,
        to: ordersState.data.to ?? null,
        total: ordersState.data.total ?? 0,
        last_page: ordersState.data.last_page ?? 1,
      }
    : null;
  const outstanding = ordersState.data?.outstanding ?? null;
  const loading = ordersState.loading;
  const error = customerState.error ?? ordersState.error;

  if (customerState.loading && !customer) {
    return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-primary" /></div>;
  }

  if (error) {
    return (
      <Card>
        <p className="text-error">{error}</p>
        <Button onClick={() => router.push('/admin/crm/customers')} variant="ghost" className="mt-4 gap-2">
          <ArrowLeft size={14} /> Back to customers
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/admin/crm/customers')}
        className="btn btn-sm btn-ghost gap-2 pl-0 hover:bg-transparent hover:text-primary -ml-2 text-base-content/70"
      >
        <ArrowLeft size={16} /> Back to Customers
      </button>

      <PageHeader
        title={customer?.name ?? 'Customer'}
        subtitle={customer?.organization?.name}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Contact">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Phone size={15} className="text-base-content/50 shrink-0" /> {customer?.phone || '—'}</li>
            <li className="flex items-center gap-2"><Mail size={15} className="text-base-content/50 shrink-0" /> {customer?.email || '—'}</li>
            <li className="flex items-start gap-2"><MapPin size={15} className="text-base-content/50 shrink-0 mt-0.5" /> {customer?.address || '—'}</li>
          </ul>
        </Card>

        <Card title="Loyalty">
          <div className="text-3xl font-bold text-primary">{customer?.loyalty_points ?? 0}</div>
          <p className="text-sm text-base-content/60 mt-1">points · {customer?.tier || 'Bronze'} tier</p>
        </Card>

        <Card title="Orders">
          <div className="text-3xl font-bold text-primary flex items-center gap-2">
            <ShoppingBag size={22} />
            {/* A placeholder, not 0, while the count is unknown - "0 orders
                placed" is a statement about the customer, and a wrong one. */}
            {meta ? meta.total : <span className="skeleton h-8 w-16 inline-block align-middle" />}
          </div>
          <p className="text-sm text-base-content/60 mt-1">orders placed</p>
        </Card>

        {/* Owed money is the first thing anyone opening a customer record wants
            to know, so it sits with the other headline figures rather than
            waiting to be spotted in the history below. */}
        <Card title="Owed by this customer">
          {outstanding === null ? (
            <div className="skeleton h-8 w-28" />
          ) : outstanding.amount > 0 ? (
            <>
              <div className="text-3xl font-bold text-warning flex items-center gap-2">
                <Clock size={22} />
                {money(outstanding.amount)}
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                across {outstanding.orders} order{outstanding.orders === 1 ? '' : 's'} on account
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-base-content/30">{money(0)}</div>
              <p className="text-sm text-base-content/60 mt-1">nothing outstanding</p>
            </>
          )}
        </Card>
      </div>

      <Card title="Order history">
        {loading ? (
          <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
        ) : (
          <>
            <Table
              columns={[
                { key: 'id', label: 'Order' },
                { key: 'created_at', label: 'Date', render: (row: Order) => new Date(row.created_at).toLocaleString() },
                { key: 'order_type', label: 'Type' },
                { key: 'status', label: 'Status', render: (row: Order) => row.status_label || row.status },
                {
                  key: 'payment_status',
                  label: 'Payment',
                  render: (row: Order) => (
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`badge badge-sm ${paymentBadge(row.payment_status).className}`}>
                        {paymentBadge(row.payment_status).label}
                      </span>
                      {/* The arrangement, not just the state - "Room 402" is
                          what tells whoever collects who to ask. */}
                      {row.payment_status === 'due' && row.due_note && (
                        <span className="text-xs text-base-content/60">{row.due_note}</span>
                      )}
                    </div>
                  ),
                },
                { key: 'items', label: 'Items', render: (row: Order) => row.items?.length ?? 0 },
                { key: 'total', label: 'Total', render: (row: Order) => money(row.total) },
                {
                  key: 'amount_outstanding',
                  label: 'Outstanding',
                  render: (row: Order) =>
                    row.payment_status === 'due' ? (
                      <span className="font-semibold text-warning">{money(row.amount_outstanding ?? row.total)}</span>
                    ) : (
                      <span className="text-base-content/30">—</span>
                    ),
                },
                {
                  key: 'collect',
                  label: '',
                  render: (row: Order) =>
                    row.payment_status === 'due' ? (
                      <button
                        className="btn btn-xs btn-warning gap-1"
                        onClick={(e) => { e.stopPropagation(); setSettlingOrder(row); }}
                      >
                        <Banknote size={13} /> Collect
                      </button>
                    ) : null,
                },
              ]}
              data={orders}
              onRowClick={(row: Order) => router.push(`/admin/orders?highlight=${row.id}`)}
            />

            {meta && meta.total > 0 && (
              <div className="mt-4 text-sm text-base-content/60">
                Showing {meta.from}-{meta.to} of {meta.total} orders
              </div>
            )}

            {meta && meta.last_page > 1 && (
              <div className="flex justify-center mt-6 pb-2">
                <div className="join">
                  <button className="join-item btn btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>«</button>
                  <button className="join-item btn btn-sm bg-base-100 cursor-default">Page {page} of {meta.last_page}</button>
                  <button className="join-item btn btn-sm" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}>»</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {settlingOrder && (
        <SettleDueModal
          order={settlingOrder}
          onClose={() => setSettlingOrder(null)}
          onSettled={ordersState.reload}
        />
      )}
    </div>
  );
}
