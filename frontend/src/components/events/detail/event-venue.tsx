import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { EventVenue } from '@/lib/sample-events';
import { VenuePerkIcon } from './event-icon';
import { SectionHeading } from './section-heading';

export function EventVenueSection({ venue }: { venue: EventVenue }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    venue.mapQuery
  )}`;

  return (
    <section className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02)] sm:p-6">
      <SectionHeading
        title="Venue & getting there"
        action={
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1c1b1b] underline-offset-4 hover:underline"
          >
            Open in Google Maps
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      />

      <div className="mt-4">
        <h3 className="text-base font-bold text-[#1c1b1b]">{venue.name}</h3>
        <p className="mt-0.5 text-xs text-[#747878]">{venue.address}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {venue.perks.map((perk) => (
            <li
              key={perk.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e0dbd9] bg-[#faf8f7] px-3 py-1 text-[11px] font-medium text-[#444748]"
            >
              <VenuePerkIcon icon={perk.icon} className="h-3.5 w-3.5 text-[#1c1b1b]" />
              {perk.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Stylised map panel — decorative, with the address kept in text above */}
      <div className="relative mt-4 h-56 overflow-hidden rounded-xl border border-[#e5e2e1] bg-[#eef3f0]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(#d9e3dd 1px, transparent 1px), linear-gradient(90deg, #d9e3dd 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }}
        />
        <div aria-hidden="true" className="absolute left-0 right-0 top-[38%] h-4 bg-white/80" />
        <div aria-hidden="true" className="absolute bottom-0 left-[30%] top-0 w-4 bg-white/80" />
        <div aria-hidden="true" className="absolute -right-10 bottom-8 h-24 w-40 rounded-full bg-[#cfe3d4]" />
        <div aria-hidden="true" className="absolute -left-12 top-4 h-20 w-32 rounded-full bg-[#d8e1ea]" />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1c1b1b] shadow-lg">
            <MapPin className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
          <span className="mt-1.5 inline-block rounded-md bg-[#1c1b1b] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white shadow-md">
            {venue.entrance}
          </span>
        </div>

        <p className="absolute bottom-3 left-3 right-3 rounded-md bg-white/90 px-3 py-2 text-[10px] font-medium text-[#444748] shadow-sm backdrop-blur sm:right-auto">
          <span className="font-bold text-[#1c1b1b]">Shuttle dropoff: </span>
          {venue.shuttle}
        </p>
      </div>
    </section>
  );
}

export default EventVenueSection;
