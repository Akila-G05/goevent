import React from 'react';
import {
  Accessibility,
  Brain,
  Briefcase,
  Bus,
  Music,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  Terminal,
  Ticket,
  Users,
} from 'lucide-react';
import type { EventHighlight, VenuePerk } from '@/lib/sample-events';

const HIGHLIGHT_ICONS = {
  terminal: Terminal,
  brain: Brain,
  briefcase: Briefcase,
  music: Music,
  shield: ShieldCheck,
  ticket: Ticket,
  users: Users,
  sparkles: Sparkles,
} as const;

const VENUE_ICONS = {
  shuttle: Bus,
  parking: ParkingCircle,
  accessible: Accessibility,
} as const;

export function HighlightIcon({
  icon,
  className,
}: {
  icon: EventHighlight['icon'];
  className?: string;
}) {
  const Icon = HIGHLIGHT_ICONS[icon];
  return <Icon className={className} aria-hidden="true" />;
}

export function VenuePerkIcon({
  icon,
  className,
}: {
  icon: VenuePerk['icon'];
  className?: string;
}) {
  const Icon = VENUE_ICONS[icon];
  return <Icon className={className} aria-hidden="true" />;
}
