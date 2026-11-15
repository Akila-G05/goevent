'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Image as ImageIcon,
  Link2,
  MapPin,
  Plus,
  Sparkles,
  Tag,
  Ticket,
  Trash2,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/lib/toast-store';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_BANNER_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CATEGORIES = [
  'Education',
  'Technology',
  'Music',
  'Cultural',
  'Business',
  'Sports',
  'Workshop',
  'Conference',
  'Seminar',
  'Exhibition',
  'Theatre',
  'Festival',
  'Networking',
  'Competition',
  'Career',
  'Other',
];

const AUDIENCES = ['University', 'Public', 'Both'];

type EventLevel = 'LISTING_ONLY' | 'FREE' | 'PAYED';

const EVENT_LEVELS: Array<{ id: EventLevel; label: string; hint: string }> = [
  { id: 'LISTING_ONLY', label: 'Listing only', hint: 'Announce the event without ticket sales' },
  { id: 'FREE', label: 'Free', hint: 'Issue free tickets to attendees' },
  { id: 'PAYED', label: 'Paid', hint: 'Sell one or more ticket tiers' },
];

const TAG_GROUPS: Array<{ group: string; options: Array<{ id: string; name: string }> }> = [
  {
    group: 'Topic',
    options: [
      { id: 'topic-technology', name: 'Technology' },
      { id: 'topic-ai', name: 'Artificial Intelligence' },
      { id: 'topic-software', name: 'Software Development' },
      { id: 'topic-security', name: 'Cybersecurity' },
      { id: 'topic-business', name: 'Business' },
      { id: 'topic-career', name: 'Career' },
      { id: 'topic-networking', name: 'Networking' },
    ],
  },
  {
    group: 'Format',
    options: [
      { id: 'format-workshop', name: 'Workshop' },
      { id: 'format-seminar', name: 'Seminar' },
      { id: 'format-conference', name: 'Conference' },
      { id: 'format-exhibition', name: 'Exhibition' },
    ],
  },
  {
    group: 'Audience',
    options: [
      { id: 'audience-students', name: 'University Students' },
      { id: 'audience-public', name: 'Public' },
    ],
  },
];

interface DateRow {
  key: number;
  date: string;
  time: string;
}

interface TicketRow {
  key: number;
  quantity: string;
  price: string;
  description: string;
  saleStartAt: string;
  saleEndAt: string;
}

const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#736e6c]';
const inputClass =
  'w-full rounded-xl border border-[#e0dbd9] bg-[#faf8f7] px-3.5 py-2.5 text-sm text-[#1c1b1b] placeholder-[#a8a4a3] outline-none transition-colors focus:border-[#1c1b1b] focus:bg-white focus:ring-2 focus:ring-[#1c1b1b]/10';

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-red-500">
      *
    </span>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
      </div>
      {hint && <p className="text-[11px] text-[#918c8a]">{hint}</p>}
    </div>
  );
}

export interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateEventModal({ open, onClose }: CreateEventModalProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const dateKey = useRef(1);
  const ticketKey = useRef(1);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [eventLevel, setEventLevel] = useState<EventLevel>('LISTING_ONLY');
  const [dates, setDates] = useState<DateRow[]>([{ key: 0, date: '', time: '' }]);
  const [tickets, setTickets] = useState<TicketRow[]>([
    { key: 0, quantity: '', price: '', description: '', saleStartAt: '', saleEndAt: '' },
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const objectUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  const replacePreview = (
    setter: React.Dispatch<React.SetStateAction<string | null>>,
    next: string | null
  ) => {
    setter((previous) => {
      if (previous) {
        URL.revokeObjectURL(previous);
      }
      return next;
    });
  };

  const handleFile = (file: File | undefined, kind: 'image' | 'banner') => {
    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Choose a JPEG, PNG or WebP image.');
      return;
    }

    const limit = kind === 'banner' ? MAX_BANNER_BYTES : MAX_IMAGE_BYTES;

    if (file.size > limit) {
      setImageError(`Image must be ${limit / (1024 * 1024)} MB or smaller.`);
      return;
    }

    setImageError(null);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);

    if (kind === 'image') {
      replacePreview(setImagePreview, url);
    } else {
      replacePreview(setBannerPreview, url);
    }
  };

  const clearPreview = (kind: 'image' | 'banner') => {
    if (kind === 'image') {
      replacePreview(setImagePreview, null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } else {
      replacePreview(setBannerPreview, null);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const addDate = () => {
    setDates((previous) => [...previous, { key: dateKey.current++, date: '', time: '' }]);
  };

  const removeDate = (key: number) => {
    setDates((previous) => (previous.length > 1 ? previous.filter((row) => row.key !== key) : previous));
  };

  const updateDate = (key: number, field: 'date' | 'time', value: string) => {
    setDates((previous) =>
      previous.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  const addTicket = () => {
    setTickets((previous) => [
      ...previous,
      { key: ticketKey.current++, quantity: '', price: '', description: '', saleStartAt: '', saleEndAt: '' },
    ]);
  };

  const removeTicket = (key: number) => {
    setTickets((previous) =>
      previous.length > 1 ? previous.filter((row) => row.key !== key) : previous
    );
  };

  const updateTicket = (key: number, field: keyof Omit<TicketRow, 'key'>, value: string) => {
    setTickets((previous) =>
      previous.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  const toggleTag = (id: string) => {
    setSelectedTags((previous) =>
      previous.includes(id) ? previous.filter((tag) => tag !== id) : [...previous, id]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast.info('Create Event is a design preview — saving will be connected next.');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Create event"
      description="Set up a new event. Fields marked * are required."
      panelClassName="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#f0eceb] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#1c1b1b] transition-colors hover:bg-[#e4dfde]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            className="flex items-center gap-2 rounded-full bg-[#1c1b1b] px-6 py-2.5 text-xs font-bold tracking-wider text-white transition-colors hover:bg-[#333131]"
          >
            <Plus className="h-4 w-4" />
            Create event
          </button>
        </>
      }
    >
      <form id="create-event-form" onSubmit={handleSubmit} noValidate className="space-y-7">
        <div className="flex items-start gap-2 rounded-xl border border-[#e0dbd9] bg-[#faf8f7] px-3.5 py-3 text-xs text-[#736e6c]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1c1b1b]" />
          <span>Design preview — this form is not saved to the backend yet.</span>
        </div>

        {/* Event image */}
        <section className="space-y-4">
          <SectionHeading
            icon={<ImageIcon className="h-4 w-4 text-[#1c1b1b]" />}
            title="Event image"
            hint="JPEG, PNG or WebP"
          />

          <input
            ref={imageInputRef}
            id="event-image"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0], 'image');
              event.target.value = '';
            }}
          />

          <div className="overflow-hidden rounded-2xl border border-dashed border-[#ddd8d6] bg-[#faf8f7]">
            {imagePreview ? (
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Event cover preview"
                  className="h-48 w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-white"
                  >
                    Change image
                  </button>
                  <button
                    type="button"
                    onClick={() => clearPreview('image')}
                    className="rounded-full bg-black/40 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex h-48 w-full flex-col items-center justify-center gap-2 text-[#736e6c] transition-colors hover:bg-[#f0eceb]/60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0eceb]">
                  <ImageIcon className="h-5 w-5 text-[#1c1b1b]" />
                </span>
                <span className="text-sm font-semibold text-[#1c1b1b]">Upload cover image</span>
                <span className="text-[11px]">JPEG, PNG or WebP · up to 5 MB</span>
              </button>
            )}
          </div>

          <div>
            <label htmlFor="event-banner" className={labelClass}>
              Banner <span className="font-medium normal-case tracking-normal text-[#918c8a]">(optional)</span>
            </label>
            <input
              ref={bannerInputRef}
              id="event-banner"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(',')}
              className="hidden"
              onChange={(event) => {
                handleFile(event.target.files?.[0], 'banner');
                event.target.value = '';
              }}
            />
            {bannerPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-[#e0dbd9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerPreview} alt="Event banner preview" className="h-24 w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[#1c1b1b] hover:bg-white"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => clearPreview('banner')}
                    className="rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black/60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#ddd8d6] bg-[#faf8f7] px-4 py-3 text-xs text-[#736e6c] transition-colors hover:bg-[#f0eceb]/60"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Add a wide banner for the event page
                </span>
                <span className="font-semibold text-[#1c1b1b]">Upload · up to 8 MB</span>
              </button>
            )}
          </div>

          {imageError && (
            <p role="alert" className="text-[11px] font-medium text-red-600">
              {imageError}
            </p>
          )}
        </section>

        {/* Event details */}
        <section className="space-y-4 border-t border-[#f0eceb] pt-5">
          <SectionHeading
            icon={<CalendarDays className="h-4 w-4 text-[#1c1b1b]" />}
            title="Event details"
          />

          <div>
            <label htmlFor="event-name" className={labelClass}>
              Event name <RequiredMark />
            </label>
            <input
              id="event-name"
              name="name"
              type="text"
              maxLength={100}
              placeholder="e.g. Tech Fest 2026"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="event-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="event-description"
              name="description"
              rows={4}
              placeholder="What should attendees know before they register?"
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-category" className={labelClass}>
                Category <RequiredMark />
              </label>
              <select id="event-category" name="categoryId" defaultValue="" className={inputClass}>
                <option value="">Select a category</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="event-audience" className={labelClass}>
                Audience <RequiredMark />
              </label>
              <select id="event-audience" name="audienceId" defaultValue="" className={inputClass}>
                <option value="">Select an audience</option>
                {AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audience}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className={labelClass}>
              Event type <RequiredMark />
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EVENT_LEVELS.map((level) => {
                const selected = eventLevel === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setEventLevel(level.id)}
                    className={`rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      selected
                        ? 'border-[#1c1b1b] bg-[#1c1b1b] text-white'
                        : 'border-[#e0dbd9] bg-[#faf8f7] text-[#1c1b1b] hover:bg-[#f0eceb]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{level.label}</span>
                    <span
                      className={`mt-0.5 block text-[11px] ${
                        selected ? 'text-white/70' : 'text-[#918c8a]'
                      }`}
                    >
                      {level.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Venue */}
        <section className="space-y-4 border-t border-[#f0eceb] pt-5">
          <SectionHeading
            icon={<MapPin className="h-4 w-4 text-[#1c1b1b]" />}
            title="Venue"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-venue-name" className={labelClass}>
                Venue name <RequiredMark />
              </label>
              <input
                id="event-venue-name"
                name="venueName"
                type="text"
                maxLength={45}
                placeholder="e.g. Main Auditorium"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="event-venue-city" className={labelClass}>
                City <RequiredMark />
              </label>
              <input
                id="event-venue-city"
                name="venueCity"
                type="text"
                maxLength={45}
                placeholder="e.g. Colombo"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="event-venue-address" className={labelClass}>
                Address
              </label>
              <input
                id="event-venue-address"
                name="venueAddress"
                type="text"
                maxLength={150}
                placeholder="Street, building, floor"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="event-venue-link" className={labelClass}>
                Map link
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a4a3]" />
                <input
                  id="event-venue-link"
                  name="venueLink"
                  type="url"
                  maxLength={150}
                  placeholder="https://maps.google.com/..."
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* External link */}
        <section className="space-y-4 border-t border-[#f0eceb] pt-5">
          <SectionHeading
            icon={<Link2 className="h-4 w-4 text-[#1c1b1b]" />}
            title="Event link"
            hint="Registration page, website or social post"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="event-link-name" className={labelClass}>
                Link label <RequiredMark />
              </label>
              <input
                id="event-link-name"
                name="linkName"
                type="text"
                maxLength={45}
                placeholder="e.g. Register here"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="event-link-url" className={labelClass}>
                URL <RequiredMark />
              </label>
              <input
                id="event-link-url"
                name="linkUrl"
                type="url"
                maxLength={200}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="space-y-4 border-t border-[#f0eceb] pt-5">
          <SectionHeading
            icon={<CalendarDays className="h-4 w-4 text-[#1c1b1b]" />}
            title="Schedule"
            hint="Add every date the event runs"
          />

          <div className="space-y-3">
            {dates.map((row, index) => (
              <div
                key={row.key}
                className="grid grid-cols-1 gap-3 rounded-xl border border-[#eae6e5] bg-[#faf8f7] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <div>
                  <label htmlFor={`event-date-${row.key}`} className={labelClass}>
                    Date {index === 0 && <RequiredMark />}
                  </label>
                  <input
                    id={`event-date-${row.key}`}
                    type="date"
                    value={row.date}
                    onChange={(event) => updateDate(row.key, 'date', event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`event-time-${row.key}`} className={labelClass}>
                    Start time {index === 0 && <RequiredMark />}
                  </label>
                  <input
                    id={`event-time-${row.key}`}
                    type="time"
                    value={row.time}
                    onChange={(event) => updateDate(row.key, 'time', event.target.value)}
                    className={inputClass}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeDate(row.key)}
                  disabled={dates.length === 1}
                  aria-label={`Remove date ${index + 1}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#e0dbd9] bg-white text-[#736e6c] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addDate}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eceb] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#e4dfde]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add another date
          </button>
        </section>

        {/* Tickets */}
        {eventLevel === 'PAYED' && (
          <section className="space-y-4 border-t border-[#f0eceb] pt-5">
            <SectionHeading
              icon={<Ticket className="h-4 w-4 text-[#1c1b1b]" />}
              title="Ticket tiers"
              hint="Stock and price per tier"
            />

            <div className="space-y-3">
              {tickets.map((row, index) => (
                <div key={row.key} className="space-y-3 rounded-xl border border-[#eae6e5] bg-[#faf8f7] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                      Tier {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTicket(row.key)}
                      disabled={tickets.length === 1}
                      aria-label={`Remove tier ${index + 1}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#736e6c] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`ticket-qty-${row.key}`} className={labelClass}>
                        Quantity <RequiredMark />
                      </label>
                      <input
                        id={`ticket-qty-${row.key}`}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="100"
                        value={row.quantity}
                        onChange={(event) => updateTicket(row.key, 'quantity', event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor={`ticket-price-${row.key}`} className={labelClass}>
                        Price <RequiredMark />
                      </label>
                      <input
                        id={`ticket-price-${row.key}`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(event) => updateTicket(row.key, 'price', event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor={`ticket-description-${row.key}`} className={labelClass}>
                        Description
                      </label>
                      <input
                        id={`ticket-description-${row.key}`}
                        type="text"
                        placeholder="e.g. Early bird, includes lunch"
                        value={row.description}
                        onChange={(event) => updateTicket(row.key, 'description', event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor={`ticket-sale-start-${row.key}`} className={labelClass}>
                        Sales open <RequiredMark />
                      </label>
                      <input
                        id={`ticket-sale-start-${row.key}`}
                        type="datetime-local"
                        value={row.saleStartAt}
                        onChange={(event) => updateTicket(row.key, 'saleStartAt', event.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor={`ticket-sale-end-${row.key}`} className={labelClass}>
                        Sales close <RequiredMark />
                      </label>
                      <input
                        id={`ticket-sale-end-${row.key}`}
                        type="datetime-local"
                        value={row.saleEndAt}
                        onChange={(event) => updateTicket(row.key, 'saleEndAt', event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addTicket}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eceb] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#e4dfde]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add ticket tier
            </button>
          </section>
        )}

        {/* Tags */}
        <section className="space-y-4 border-t border-[#f0eceb] pt-5">
          <SectionHeading
            icon={<Tag className="h-4 w-4 text-[#1c1b1b]" />}
            title="Tags"
            hint="Helps attendees find the event"
          />

          <div className="space-y-3">
            {TAG_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                  {group.group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => {
                    const selected = selectedTags.includes(option.id);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleTag(option.id)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          selected
                            ? 'border-[#1c1b1b] bg-[#1c1b1b] text-white'
                            : 'border-[#e0dbd9] bg-[#faf8f7] text-[#1c1b1b] hover:bg-[#f0eceb]'
                        }`}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </form>
    </Dialog>
  );
}

export default CreateEventModal;
