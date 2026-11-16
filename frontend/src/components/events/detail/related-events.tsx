import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { SectionHeading } from './section-heading';

/** One "You might also like" card. Built from sample or stored events by the page. */
export interface RelatedCard {
  key: string;
  href: string;
  imageUrl: string;
  category: string;
  dateLine: string;
  venueCity: string;
  title: string;
  venueName: string;
  /** Bottom-right badge on the image, e.g. "From $65" or "Free". */
  badge: string;
  /** Footer status text, e.g. "On Sale" or "Open to public". */
  status: string;
}

export function RelatedEvents({ cards }: { cards: RelatedCard[] }) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <SectionHeading
        title="You might also like"
        hint="Curated tech forums and live tours happening across Indonesia & Southeast Asia"
        action={
          <div className="flex items-center gap-2" aria-hidden="true">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f3f2] text-[#1c1b1b] shadow-sm">
              <ChevronLeft className="h-5 w-5" />
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7f3f2] text-[#1c1b1b] shadow-sm">
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.key}
            href={card.href}
            className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-44 w-full overflow-hidden bg-[#f1edec]">
              <Image
                src={card.imageUrl}
                alt=""
                fill
                unoptimized={card.imageUrl.startsWith('/')}
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute left-3 top-3 rounded bg-[#000000] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {card.category}
              </span>
              <span className="absolute bottom-3 right-3 rounded bg-[#fdf8f8]/90 px-2 py-0.5 text-sm font-semibold text-[#111111] backdrop-blur">
                {card.badge}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#575f67]">
                  {card.dateLine} • {card.venueCity}
                </p>
                <h3 className="mt-1 font-display text-2xl uppercase leading-tight text-[#1c1b1b] transition-colors group-hover:text-[#575f67]">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm text-[#575f67]">{card.venueName}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-bold text-[#111111]">{card.status}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ebe7e6] px-3 py-1 text-xs font-semibold text-[#111111] transition-colors group-hover:bg-[#000000] group-hover:text-white">
                  View event
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedEvents;
