import React from 'react';
import { Users, CalendarCheck, ShieldAlert, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — kept local until a shared admin API type module is created
// ---------------------------------------------------------------------------

interface StatCard {
    label: string;
    value: string | number;
    delta?: string;
    icon: React.ReactNode;
    iconBg: string;
}

interface RecentEvent {
    id: number;
    title: string;
    creator: string;
    status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
    submittedAt: string;
}

interface RecentUser {
    id: number;
    fullName: string;
    email: string;
    role: 'ROLE_VIEWER' | 'ROLE_CREATOR' | 'ROLE_ADMIN';
    joinedAt: string;
}

// ---------------------------------------------------------------------------
// Sample data — replace with TanStack Query fetches once API endpoints exist
// ---------------------------------------------------------------------------

const SAMPLE_STATS: StatCard[] = [
    {
        label: 'Total Users',
        value: '1,284',
        delta: '+12 this week',
        icon: <Users className="w-5 h-5" />,
        iconBg: 'bg-indigo-100 text-indigo-600',
    },
    {
        label: 'Published Events',
        value: '347',
        delta: '+8 today',
        icon: <CalendarCheck className="w-5 h-5" />,
        iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
        label: 'Open Disputes',
        value: '5',
        delta: '2 urgent',
        icon: <ShieldAlert className="w-5 h-5" />,
        iconBg: 'bg-rose-100 text-rose-600',
    },
    {
        label: 'Gross Revenue',
        value: '$48,920',
        delta: '+$3,210 this month',
        icon: <TrendingUp className="w-5 h-5" />,
        iconBg: 'bg-amber-100 text-amber-600',
    },
];

const SAMPLE_EVENTS: RecentEvent[] = [
    { id: 1, title: 'Global Developer Conference', creator: 'Alice Perera', status: 'PUBLISHED', submittedAt: '2026-10-24' },
    { id: 2, title: 'Startup Pitch Night', creator: 'Bob Silva', status: 'DRAFT', submittedAt: '2026-10-23' },
    { id: 3, title: 'Jazz Under the Stars', creator: 'Carol Nair', status: 'PUBLISHED', submittedAt: '2026-10-22' },
    { id: 4, title: 'Colombo Food Festival', creator: 'David Raj', status: 'CANCELLED', submittedAt: '2026-10-20' },
];

const SAMPLE_USERS: RecentUser[] = [
    { id: 1, fullName: 'Alice Perera', email: 'alice@example.com', role: 'ROLE_CREATOR', joinedAt: '2026-10-24' },
    { id: 2, fullName: 'Bob Silva', email: 'bob@example.com', role: 'ROLE_VIEWER', joinedAt: '2026-10-23' },
    { id: 3, fullName: 'Carol Nair', email: 'carol@example.com', role: 'ROLE_CREATOR', joinedAt: '2026-10-21' },
    { id: 4, fullName: 'David Raj', email: 'david@example.com', role: 'ROLE_VIEWER', joinedAt: '2026-10-19' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCardItem({ card }: { card: StatCard }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4 shadow-sm">
            <div className={`p-3 rounded-lg flex-shrink-0 ${card.iconBg}`} aria-hidden="true">
                {card.icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                {card.delta && (
                    <p className="text-xs text-gray-400 mt-1">{card.delta}</p>
                )}
            </div>
        </div>
    );
}

const EVENT_STATUS_STYLES: Record<RecentEvent['status'], string> = {
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    DRAFT: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-rose-100 text-rose-700',
    COMPLETED: 'bg-indigo-100 text-indigo-700',
};

const ROLE_STYLES: Record<RecentUser['role'], string> = {
    ROLE_ADMIN: 'bg-purple-100 text-purple-700',
    ROLE_CREATOR: 'bg-indigo-100 text-indigo-700',
    ROLE_VIEWER: 'bg-gray-100 text-gray-600',
};

const ROLE_LABELS: Record<RecentUser['role'], string> = {
    ROLE_ADMIN: 'Admin',
    ROLE_CREATOR: 'Creator',
    ROLE_VIEWER: 'Viewer',
};

// ---------------------------------------------------------------------------
// Page — ROLE_ADMIN only (server-side guard to be added via middleware/layout)
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Platform overview — visible to <span className="font-medium text-indigo-600">ROLE_ADMIN</span> only
                    </p>
                </div>
                {/* Placeholder for future admin actions (e.g., export report) */}
                <span className="text-xs text-gray-400 italic">Last updated: just now</span>
            </div>

            {/* Stat cards */}
            <section aria-label="Platform statistics">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {SAMPLE_STATS.map((card) => (
                        <StatCardItem key={card.label} card={card} />
                    ))}
                </div>
            </section>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Recent events moderation table */}
                <section aria-label="Recent events pending moderation">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-base font-semibold text-gray-900">Recent Events</h2>
                            <button
                                type="button"
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                aria-label="View all events"
                            >
                                View all
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        <th className="px-6 py-3">Event</th>
                                        <th className="px-6 py-3">Creator</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {SAMPLE_EVENTS.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 max-w-[160px] truncate">
                                                {event.title}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{event.creator}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EVENT_STATUS_STYLES[event.status]}`}
                                                >
                                                    {event.status === 'PUBLISHED' && <CheckCircle2 className="w-3 h-3 mr-1" aria-hidden="true" />}
                                                    {event.status === 'CANCELLED' && <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />}
                                                    {event.status === 'DRAFT' && <Clock className="w-3 h-3 mr-1" aria-hidden="true" />}
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{event.submittedAt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Recent users table */}
                <section aria-label="Recently registered users">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-base font-semibold text-gray-900">Recent Users</h2>
                            <button
                                type="button"
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                                aria-label="View all users"
                            >
                                View all
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Role</th>
                                        <th className="px-6 py-3">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {SAMPLE_USERS.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{user.fullName}</td>
                                            <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[user.role]}`}
                                                >
                                                    {ROLE_LABELS[user.role]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{user.joinedAt}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>

            {/* Open disputes placeholder */}
            <section aria-label="Open disputes">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldAlert className="w-5 h-5 text-rose-500" aria-hidden="true" />
                        <h2 className="text-base font-semibold text-gray-900">Open Disputes</h2>
                        <span className="ml-auto text-xs font-medium bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            5 open
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Dispute management will be available once the refund and payment modules are implemented.
                        Disputes are surfaced here for admin review and resolution per platform policy.
                    </p>
                </div>
            </section>
        </div>
    );
}
