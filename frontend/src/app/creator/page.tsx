'use client';

import React from 'react';
import { Plus, CalendarDays, Ticket, Users, BarChart3, Clock, CheckCircle2, XCircle, PenSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types — kept local until a shared creator API type module is created
// ---------------------------------------------------------------------------

type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

interface CreatorEvent {
    id: number;
    title: string;
    venueName: string;
    startTime: string;
    status: EventStatus;
    totalTickets: number;
    soldTickets: number;
    grossRevenue: string;
}

interface StatCard {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ReactNode;
    iconBg: string;
}

// ---------------------------------------------------------------------------
// Sample data — replace with TanStack Query fetches once API endpoints exist
// ---------------------------------------------------------------------------

const SAMPLE_STATS: StatCard[] = [
    {
        label: 'Total Events',
        value: 8,
        sub: '3 currently published',
        icon: <CalendarDays className="w-5 h-5" />,
        iconBg: 'bg-indigo-100 text-indigo-600',
    },
    {
        label: 'Tickets Sold',
        value: '1,042',
        sub: '+28 this week',
        icon: <Ticket className="w-5 h-5" />,
        iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
        label: 'Total Attendees',
        value: '987',
        sub: 'across all events',
        icon: <Users className="w-5 h-5" />,
        iconBg: 'bg-amber-100 text-amber-600',
    },
    {
        label: 'Net Revenue',
        value: '$12,480',
        sub: 'after platform fees',
        icon: <BarChart3 className="w-5 h-5" />,
        iconBg: 'bg-violet-100 text-violet-600',
    },
];

const SAMPLE_EVENTS: CreatorEvent[] = [
    {
        id: 1,
        title: 'Global Developer Conference',
        venueName: 'Grand Convention Center, San Francisco',
        startTime: 'Nov 15, 2026 • 09:00 AM',
        status: 'PUBLISHED',
        totalTickets: 500,
        soldTickets: 312,
        grossRevenue: '$46,488',
    },
    {
        id: 2,
        title: 'React & Next.js Workshop',
        venueName: 'Tech Hub Colombo',
        startTime: 'Dec 02, 2026 • 10:00 AM',
        status: 'DRAFT',
        totalTickets: 80,
        soldTickets: 0,
        grossRevenue: '$0',
    },
    {
        id: 3,
        title: 'Cloud Architecture Summit',
        venueName: 'Hilton, Singapore',
        startTime: 'Oct 10, 2026 • 08:30 AM',
        status: 'COMPLETED',
        totalTickets: 200,
        soldTickets: 198,
        grossRevenue: '$29,700',
    },
    {
        id: 4,
        title: 'Startup Networking Night',
        venueName: 'The Garage, Colombo',
        startTime: 'Sep 20, 2026 • 06:00 PM',
        status: 'CANCELLED',
        totalTickets: 100,
        soldTickets: 34,
        grossRevenue: '$1,020',
    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<EventStatus, string> = {
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    DRAFT: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-rose-100 text-rose-700',
    COMPLETED: 'bg-indigo-100 text-indigo-700',
};

function StatusBadge({ status }: { status: EventStatus }) {
    const Icon =
        status === 'PUBLISHED' ? CheckCircle2
            : status === 'CANCELLED' ? XCircle
                : status === 'DRAFT' ? PenSquare
                    : Clock;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
        >
            <Icon className="w-3 h-3" aria-hidden="true" />
            {status}
        </span>
    );
}

function InventoryBar({ sold, total }: { sold: number; total: number }) {
    const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${pct}% tickets sold`}
                />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
                {sold} / {total}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page — ROLE_CREATOR only (server-side guard to be added via middleware/layout)
// ---------------------------------------------------------------------------

export default function CreatorDashboardPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage your events, ticket tiers, and attendees —{' '}
                        <span className="font-medium text-indigo-600">ROLE_CREATOR</span>
                    </p>
                </div>
                {/* Create event CTA — navigates to /creator/events/new once that route exists */}
                <Button
                    variant="primary"
                    size="md"
                    aria-label="Create a new event"
                    onClick={() => {
                        // TODO: router.push('/creator/events/new')
                    }}
                >
                    <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                    New Event
                </Button>
            </div>

            {/* Stat cards */}
            <section aria-label="Creator statistics">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {SAMPLE_STATS.map((card) => (
                        <div
                            key={card.label}
                            className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4 shadow-sm"
                        >
                            <div className={`p-3 rounded-lg flex-shrink-0 ${card.iconBg}`} aria-hidden="true">
                                {card.icon}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                                {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Events table */}
            <section aria-label="Your events">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">Your Events</h2>
                        <button
                            type="button"
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                            aria-label="View all your events"
                        >
                            View all
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <th className="px-6 py-3">Event</th>
                                    <th className="px-6 py-3">Date & Venue</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Tickets Sold</th>
                                    <th className="px-6 py-3">Revenue</th>
                                    <th className="px-6 py-3 sr-only">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {SAMPLE_EVENTS.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 max-w-[200px] truncate">
                                                {event.title}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-gray-700">{event.startTime}</p>
                                            <p className="text-gray-400 text-xs mt-0.5 max-w-[180px] truncate">
                                                {event.venueName}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={event.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <InventoryBar sold={event.soldTickets} total={event.totalTickets} />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {event.grossRevenue}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                                aria-label={`Manage event: ${event.title}`}
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* QR Check-in callout — placeholder until check-in module is implemented */}
            <section aria-label="QR check-in">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-shrink-0 p-3 bg-indigo-100 rounded-lg text-indigo-600" aria-hidden="true">
                        <Users className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-sm font-semibold text-indigo-900">QR Attendee Check-in</h2>
                        <p className="text-sm text-indigo-700 mt-0.5">
                            Scan attendee QR tickets at the venue for instant, verified check-in.
                            Available once the check-in module is implemented.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" aria-label="Open QR check-in scanner" disabled>
                        Launch Scanner
                    </Button>
                </div>
            </section>
        </div>
    );
}
