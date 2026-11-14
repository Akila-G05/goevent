'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgePercent,
  CalendarPlus,
  Clock,
  Info,
  Minus,
  Plus,
  QrCode,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { EventDetail } from '@/lib/sample-events';
import { formatMoney } from '@/lib/sample-events';
import { toast } from '@/lib/toast-store';

const SERVICE_FEE = 2.5;

/** Demo promo codes; a real implementation validates them on the server. */
const PROMO_CODES: Record<string, number> = {
  STUDENT25: 25,
  GOEVENT10: 10,
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function TicketPanel({ event }: { event: EventDetail }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() => ({
    [event.tickets[0]?.id ?? '']: event.tickets.length > 0 ? 1 : 0,
  }));
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const selected = event.tickets
      .map((tier) => ({ tier, quantity: quantities[tier.id] ?? 0 }))
      .filter((line) => line.quantity > 0);

    const passes = selected.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = round2(
      selected.reduce((sum, line) => sum + line.tier.price * line.quantity, 0)
    );
    const discount = promo ? round2((subtotal * promo.percent) / 100) : 0;
    const serviceFee = passes > 0 ? SERVICE_FEE : 0;
    const total = round2(subtotal - discount + serviceFee);

    return { selected, passes, subtotal, discount, serviceFee, total };
  }, [event.tickets, quantities, promo]);

  const setQuantity = (tierId: string, next: number, max: number) => {
    setQuantities((previous) => ({
      ...previous,
      [tierId]: Math.max(0, Math.min(max, next)),
    }));
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoError('Enter a promo code first.');
      return;
    }

    const percent = PROMO_CODES[code];

    if (!percent) {
      setPromoError(`“${code}” is not a valid promo code.`);
      return;
    }

    setPromo({ code, percent });
    setPromoInput('');
    setPromoError(null);
  };

  const checkout = () => {
    toast.info(
      `Checkout for ${event.title} is next — ${totals.passes} ${
        totals.passes === 1 ? 'pass' : 'passes'
      } held in this preview only.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Pass selection */}
      <div
        id="tickets"
        className="scroll-mt-28 rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">
            Select passes
          </h2>
          <span className="rounded-full bg-[#1c1b1b] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            Phase 1 active
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#747878]">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          Early bird tier expires in 2 days, 14 hrs
        </p>

        <div className="mt-4 space-y-2.5">
          {event.tickets.map((tier) => {
            const quantity = quantities[tier.id] ?? 0;
            const selected = quantity > 0;

            return (
              <div
                key={tier.id}
                className={`rounded-xl border p-3.5 transition-colors ${
                  selected
                    ? 'border-[#1c1b1b] bg-[#faf8f7] ring-1 ring-[#1c1b1b]'
                    : 'border-[#e0dbd9] bg-white hover:border-[#c4c7c7]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold text-[#1c1b1b]">{tier.name}</h3>
                      {tier.badge && (
                        <span className="rounded-sm bg-[#ebe7e6] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#444748]">
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#747878]">
                      {tier.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-[#1c1b1b]">{formatMoney(tier.price)}</p>
                    {tier.compareAt && (
                      <p className="text-[10px] font-medium text-[#a8a4a3] line-through">
                        {formatMoney(tier.compareAt)}
                      </p>
                    )}
                    <p className="text-[9px] uppercase tracking-wide text-[#747878]">{tier.note}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-[#747878]">
                    {tier.remaining} left · max {tier.maxPerOrder} per order
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(tier.id, quantity - 1, tier.maxPerOrder)}
                      disabled={quantity === 0}
                      aria-label={`Remove one ${tier.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e0dbd9] text-[#1c1b1b] transition-colors hover:border-[#1c1b1b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span
                      aria-live="polite"
                      className="w-6 text-center text-sm font-bold text-[#1c1b1b]"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(tier.id, quantity + 1, tier.maxPerOrder)}
                      disabled={quantity >= tier.maxPerOrder}
                      aria-label={`Add one ${tier.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e0dbd9] text-[#1c1b1b] transition-colors hover:border-[#1c1b1b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo code */}
        <div className="mt-4">
          {promo ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#1c1b1b] bg-[#faf8f7] px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#1c1b1b]">
                <BadgePercent className="h-4 w-4" aria-hidden="true" />
                {promo.code} applied (−{promo.percent}%)
              </span>
              <button
                type="button"
                onClick={() => setPromo(null)}
                aria-label="Remove promo code"
                className="text-[#747878] transition-colors hover:text-[#1c1b1b]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="promo-code" className="sr-only">
                Promo code
              </label>
              <input
                id="promo-code"
                type="text"
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value);
                  setPromoError(null);
                }}
                placeholder="Promo code"
                className="w-full rounded-xl border border-[#e0dbd9] bg-[#faf8f7] px-3 py-2 text-xs uppercase text-[#1c1b1b] placeholder:normal-case placeholder:text-[#a8a4a3] focus:border-[#1c1b1b] focus:outline-none focus:ring-1 focus:ring-[#1c1b1b]"
              />
              <button
                type="button"
                onClick={applyPromo}
                className="shrink-0 rounded-xl bg-[#1c1b1b] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#333131]"
              >
                Apply
              </button>
            </div>
          )}
          {promoError && (
            <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-600">
              {promoError}
            </p>
          )}
          <p className="mt-1.5 text-[10px] text-[#a8a4a3]">
            Demo code: <span className="font-semibold text-[#747878]">STUDENT25</span>
          </p>
        </div>

        {/* Totals */}
        <dl className="mt-4 space-y-2 border-t border-[#eae6e5] pt-3 text-xs">
          <div className="flex items-center justify-between text-[#444748]">
            <dt>Selected passes</dt>
            <dd className="font-semibold text-[#1c1b1b]">
              {totals.passes} {totals.passes === 1 ? 'Ticket' : 'Tickets'}
            </dd>
          </div>
          {totals.passes > 0 && (
            <div className="flex items-center justify-between text-[#444748]">
              <dt>Subtotal</dt>
              <dd className="font-semibold text-[#1c1b1b]">{formatMoney(totals.subtotal)}</dd>
            </div>
          )}
          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-[#444748]">
              <dt>Promo discount</dt>
              <dd className="font-semibold text-emerald-700">−{formatMoney(totals.discount)}</dd>
            </div>
          )}
          {totals.serviceFee > 0 && (
            <div className="flex items-center justify-between text-[#444748]">
              <dt>Platform service &amp; QR delivery</dt>
              <dd className="font-semibold text-[#1c1b1b]">{formatMoney(totals.serviceFee)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#eae6e5] pt-2">
            <dt className="text-sm font-bold uppercase tracking-wide text-[#1c1b1b]">
              Total amount
            </dt>
            <dd className="text-lg font-bold text-[#1c1b1b]">{formatMoney(totals.total)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={checkout}
          disabled={totals.passes === 0}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#1c1b1b] px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#333131] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Proceed to checkout
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => toast.info('Calendar exports (.ics) arrive with the booking module.')}
          className="mt-2 flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-semibold text-[#747878] transition-colors hover:text-[#1c1b1b]"
        >
          <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add to Google / Apple Calendar (.ics)
        </button>
      </div>

      {/* Trust badges */}
      <ul className="grid grid-cols-3 gap-2 rounded-2xl border border-[#e5e2e1] bg-white p-3">
        {[
          { icon: ShieldCheck, label: '100% Certified' },
          { icon: QrCode, label: 'Instant QR pass' },
          { icon: RotateCcw, label: '48h free refund' },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-4 w-4 text-[#1c1b1b]" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-[#444748]">{label}</span>
          </li>
        ))}
      </ul>

      {/* Requirements */}
      <div className="rounded-2xl border border-[#e5e2e1] bg-[#faf8f7] p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#1c1b1b]">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          Attendee requirements
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#747878]">{event.requirements}</p>
        <button
          type="button"
          onClick={() => toast.info('The code of conduct opens with the event policy pages.')}
          className="mt-2 text-[11px] font-semibold text-[#1c1b1b] underline-offset-4 hover:underline"
        >
          Read code of conduct &amp; safety protocols →
        </button>
      </div>
    </div>
  );
}

export default TicketPanel;
