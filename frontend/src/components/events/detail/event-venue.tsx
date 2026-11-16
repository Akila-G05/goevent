import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import type { EventVenue } from '@/lib/sample-events';
import { VenuePerkIcon } from './event-icon';
import { SectionHeading } from './section-heading';

/** Map artwork from the approved design (code.html, venue section). */
const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAIBjb0UnAqVpT4t-AcPZsmPt02ecvA__01nURh6-OtzvrpHOcu-cof7kX_FBt5kZNkDyP16fzt3PCawQJwEd1u9yjSVkzkrE9atH7rPqxjI6UPEUpPTCl0mSBXakquhcshE5SJX4xb-atyHmgWGfsW9vbCsUBxUOFrdjkaQoPNMofmCx__eAXhXVS7mg5k4CChLonOZpM8wDoCIb-RgxRQSmLHG2jR3WW_3R-X9veW";

export function EventVenueSection({ venue }: { venue: EventVenue }) {
  const mapsUrl =
    venue.googleLink ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapQuery)}`;
  const embedUrl = venue.googleLink
    ? `https://www.google.com/maps?q=${encodeURIComponent(venue.mapQuery)}&output=embed`
    : null;

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title="Venue & getting there"
        action={
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f3f2] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#ebe7e6]"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
      />

      <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-xl font-semibold text-[#1c1b1b]">{venue.name}</h3>
          <p className="mt-1 text-sm text-[#575f67]">{venue.address}</p>

          {venue.perks.length > 0 && (
            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#575f67]">
              {venue.perks.map((perk) => (
                <li key={perk.label} className="flex items-center gap-1.5">
                  <VenuePerkIcon icon={perk.icon} className="h-4 w-4 text-[#111111]" />
                  {perk.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative h-[280px] overflow-hidden rounded-xl shadow-inner">
          {embedUrl ? (
            <iframe
              title={`Google Map of ${venue.name}`}
              src={embedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div
              role="img"
              aria-label={`Map of ${venue.name}`}
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url("${MAP_IMAGE}")` }}
            />
          )}

          {venue.entrance && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-[#000000] px-4 py-2 text-white shadow-2xl">
              <MapPin className="h-4 w-4 text-[#ffb4ab]" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-wide">{venue.entrance}</span>
            </div>
          )}

          {venue.shuttle && (
            <p className="absolute bottom-4 left-4 rounded-lg bg-[#fdf8f8]/95 px-4 py-2 text-sm text-[#1c1b1b] shadow-md backdrop-blur-md">
              <strong>Shuttle dropoff:</strong> {venue.shuttle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default EventVenueSection;
