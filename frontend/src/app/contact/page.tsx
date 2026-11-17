'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowUpRight, CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { Footer } from '@/components/shared/footer';

const TOPICS = [
  'General question',
  'Hosting an event',
  'Tickets and check-in',
  'Account help',
  'Partnership',
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email address').max(254),
  topic: z.enum(TOPICS, { errorMap: () => ({ message: 'Please choose a topic' }) }),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be 2000 characters or fewer'),
});

type ContactFormData = z.infer<typeof contactSchema>;

const CONTACT_DETAILS = [
  { icon: Mail, label: 'Email', value: 'hello@goevent.example' },
  { icon: Phone, label: 'Phone', value: '+94 11 000 0000' },
  { icon: MapPin, label: 'Office', value: 'Colombo, Sri Lanka' },
];

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 ${
    hasError ? 'border-red-400 focus:ring-red-200' : 'border-zinc-300 focus:ring-zinc-300'
  }`;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState<ContactFormData | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', topic: TOPICS[0], message: '' },
  });

  // Sample page: the message is only shown back to the visitor, not sent anywhere.
  const onSubmit = (data: ContactFormData) => {
    setSubmitted(data);
    reset();
  };

  return (
    <div className="bg-[#f8f9fa] text-black">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <section className="space-y-8 lg:col-span-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">Get in touch</p>
              <h1 className="mt-3 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">
                Contact<br />Us
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-zinc-600">
                Questions about hosting an event, your account or a booking? Tell us what you need and our team will
                get back to you.
              </p>
            </div>

            <ul className="space-y-3">
              {CONTACT_DETAILS.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className="text-sm font-semibold text-black">{value}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-zinc-500">Sample contact details. Replace them before launch.</p>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10 lg:col-span-7">
            <h2 className="font-display text-4xl font-black uppercase">Send a message</h2>

            {submitted && (
              <div role="status" className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  Thanks, {submitted.name}. This is a sample form, so your message was not sent yet.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="contact-name" label="Full name" error={errors.name?.message}>
                  <input
                    id="contact-name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    className={inputClass(!!errors.name)}
                    placeholder="Your name"
                    {...register('name')}
                  />
                </Field>

                <Field id="contact-email" label="Email" error={errors.email?.message}>
                  <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className={inputClass(!!errors.email)}
                    placeholder="you@example.com"
                    {...register('email')}
                  />
                </Field>
              </div>

              <Field id="contact-topic" label="Topic" error={errors.topic?.message}>
                <select
                  id="contact-topic"
                  aria-invalid={!!errors.topic}
                  className={inputClass(!!errors.topic)}
                  {...register('topic')}
                >
                  {TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="contact-message" label="Message" error={errors.message?.message}>
                <textarea
                  id="contact-message"
                  rows={6}
                  aria-invalid={!!errors.message}
                  className={inputClass(!!errors.message)}
                  placeholder="How can we help?"
                  {...register('message')}
                />
              </Field>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-95"
              >
                Send message
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
