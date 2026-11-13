'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  Users,
  CheckCircle2,
  SlidersHorizontal,
  PlusCircle,
  QrCode,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Radio,
  ArrowUpRight,
  Receipt,
  UserCheck,
  UserPlus,
  Sparkles,
  UserRound,
  ChevronRight,
  Activity,
  ScanLine,
} from 'lucide-react';
import { useSessionStore, getDisplayName, getRoleLabel } from '@/lib/session-store';
import { useLogout } from '@/hooks/use-logout';

type RoleView = 'USER' | 'STUDENT' | 'ORGANIZER' | 'ADMIN' | 'CONTRIBUTOR';
type TabType = 'overview' | 'my-events' | 'sales' | 'attendees' | 'saved' | 'settings';

export default function ProfilePage() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const { logout, isLoggingOut } = useLogout();

  // Active role view in the switcher (defaults to ORGANIZER or user's active role)
  const [activeRoleView, setActiveRoleView] = useState<RoleView>('ORGANIZER');
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isScannerActive, setIsScannerActive] = useState(false);

  const displayName = getDisplayName(user);
  const userRole = user?.roleId || 'ORGANIZER';

  const roleDescriptions: Record<RoleView, string> = {
    USER: 'Viewing as USER. Standard attendee view with ticket booking and pass storage.',
    STUDENT: 'Viewing as STUDENT. University discounts, verified campus credentials, and student passes unlocked.',
    ORGANIZER: 'Viewing as ORGANIZER. Full event publishing, ticket tiers, and gate check-in tools unlocked.',
    ADMIN: 'Viewing as ADMIN. Platform moderation, disputes, and full system management unlocked.',
    CONTRIBUTOR: 'Viewing as CONTRIBUTOR. Event promotion, affiliate links, and commission reporting unlocked.',
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0c] text-white pt-20 pb-20">
      {/* Role Switcher & Environment Bar */}
      <section className="w-full bg-[#121216] border-b border-white/10 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-0.5 no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5" /> Role View:
            </span>
            {(['USER', 'STUDENT', 'ORGANIZER', 'ADMIN', 'CONTRIBUTOR'] as RoleView[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRoleView(r)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider transition-all uppercase shrink-0 ${
                  activeRoleView === r
                    ? 'bg-white text-black shadow-md font-bold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {r === activeRoleView && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse" />
                )}
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1 rounded-full text-zinc-300 text-xs w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-md text-[11px] sm:text-xs">
                {roleDescriptions[activeRoleView]}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full shrink-0">
              Live Mode
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Profile Header Hero Card */}
        <div className="w-full bg-[#121216] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          {/* Subtle Ambient Red Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-red-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-white/20 shadow-xl flex items-center justify-center text-3xl font-display font-bold text-white tracking-widest">
                {displayName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'AG'}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white text-black rounded-full flex items-center justify-center shadow-lg border border-white/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide text-white">
                  {displayName}
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-white text-black font-bold text-[11px] uppercase tracking-widest">
                  {activeRoleView}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-400 font-semibold text-[11px] tracking-wider">
                  ID: #{user?.userId ? `USR-${user.userId}` : 'VT-8920'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                <Users className="w-4 h-4 text-red-400 shrink-0" />
                <span>VoiceTech Community • Committee Member</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400 mt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" /> {user?.email || 'akila@example.com'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" /> +94 77 123 4567
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Colombo • Global Events Lead
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
            <button
              type="button"
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <Link
              href="/#events"
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-xs tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 group"
            >
              <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform text-black" />
              + Create Event
            </Link>
          </div>
        </div>

        {/* 4 Metric Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 */}
          <div className="bg-[#121216] border border-white/10 p-5 rounded-2xl shadow-lg flex flex-col justify-between gap-3 group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Total Published Events
              </span>
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Calendar className="w-4 h-4 text-red-400" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-white tracking-wide">14</div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                <span className="flex items-center text-emerald-400 font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +2
                </span>
                <span>launched this month</span>
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-[#121216] border border-white/10 p-5 rounded-2xl shadow-lg flex flex-col justify-between gap-3 group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Upcoming Live Tours
              </span>
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Radio className="w-4 h-4 text-purple-400" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-white tracking-wide flex items-center gap-2">
                4
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="text-xs text-zinc-400 mt-1">Active ticketing & staging</div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-[#121216] border border-white/10 p-5 rounded-2xl shadow-lg flex flex-col justify-between gap-3 group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Tickets Sold
              </span>
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Ticket className="w-4 h-4 text-amber-400" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-white tracking-wide">3,840</div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1.5">
                <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '88%' }} />
                </div>
                <span>88% aggregate sell-out</span>
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-[#121216] border border-white/10 p-5 rounded-2xl shadow-lg flex flex-col justify-between gap-3 group hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Total Gross Volume
              </span>
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-white tracking-wide">$68.4K</div>
              <div className="text-xs text-zinc-400 mt-1">
                <span>3,420 checked-in via Gate QR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Strip */}
        <div className="w-full bg-[#121216] border border-white/10 rounded-2xl p-1.5 shadow-lg flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'my-events', label: 'My Events (14)' },
            { id: 'sales', label: 'Ticket Sales & Gate' },
            { id: 'attendees', label: 'Attendees Roster' },
            { id: 'saved', label: 'Saved Events' },
            { id: 'settings', label: 'Settings & Payouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Workspace Layout (8 cols / 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Operations & Active Events (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Quick Actions Bar */}
            <div className="bg-[#121216] border border-white/10 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-xl uppercase tracking-wide text-white">
                Quick Actions
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerActive(!isScannerActive)}
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <ScanLine className="w-3.5 h-3.5 text-red-400" /> Fast Scanner
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Attendee Pass
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Sales Report
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                </button>
              </div>
            </div>

            {/* Upcoming Published Events Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-white">
                    Live Tour Dates & Events
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Real-time capacity monitor and check-in velocity.
                  </p>
                </div>
                <Link
                  href="/#events"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  View All (14) <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Event 1 Card */}
              <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="w-full md:w-56 h-44 rounded-xl overflow-hidden shrink-0 relative bg-zinc-900 border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
                  <img
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80"
                    alt="LE PHARAOHS TOUR"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 z-20 bg-black/90 border border-white/20 text-white px-2.5 py-1 rounded-lg text-center leading-none">
                    <span className="block text-[10px] font-bold text-red-400">MAY</span>
                    <span className="font-display text-lg">18</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] uppercase font-bold tracking-wider">
                        SELLING FAST
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">Ref: #EVT-4819</span>
                    </div>
                    <h3 className="font-display text-2xl uppercase text-white tracking-wide">
                      LE PHARAOHS X SERKONSER TOUR
                    </h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Lapangan Merah, Surabaya • Main Stage A</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold">Tickets Sold: 820 / 1,000</span>
                      <span className="text-emerald-400 font-bold">82% Filled</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '82%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Gross: $41,000</span>
                      <span>180 Passes remaining</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-white">AK</div>
                      <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-white">JD</div>
                      <div className="w-7 h-7 rounded-full bg-red-900 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-red-200">+818</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
                      >
                        View 820 Attendees
                      </button>
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1 shadow-md"
                      >
                        Manage Event <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event 2 Card */}
              <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-5 hover:border-white/20 transition-all relative overflow-hidden">
                <div className="w-full md:w-56 h-44 rounded-xl overflow-hidden shrink-0 relative bg-zinc-900 border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
                  <img
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80"
                    alt="SOUND OF HERACLES METAL FEST"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 z-20 bg-black/90 border border-white/20 text-white px-2.5 py-1 rounded-lg text-center leading-none">
                    <span className="block text-[10px] font-bold text-purple-400">JUN</span>
                    <span className="font-display text-lg">24</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[10px] uppercase font-bold tracking-wider">
                        PUBLISHED • TIER 2
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">Ref: #EVT-4932</span>
                    </div>
                    <h3 className="font-display text-2xl uppercase text-white tracking-wide">
                      SOUND OF HERACLES METAL FEST
                    </h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Gedung Serbaguna, Surabaya • Indoor Arena</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold">Tickets Sold: 540 / 600</span>
                      <span className="text-emerald-400 font-bold">90% Filled</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: '90%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>Gross: $27,000</span>
                      <span>60 VIP Passes left</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-white">MR</div>
                      <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-white">SL</div>
                      <div className="w-7 h-7 rounded-full bg-purple-900 border-2 border-[#121216] flex items-center justify-center text-[10px] font-bold text-purple-200">+538</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
                      >
                        View 540 Attendees
                      </button>
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1 shadow-md"
                      >
                        Manage Event <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl uppercase tracking-wide text-white">
                    Recent Booking & Ticket Sales
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Real-time attendee transactions processed via GoEvent Gateway.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full w-max">
                  Auto-refresh: 10s
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-zinc-400 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                      <th className="py-2.5 px-3 rounded-l-lg">Event Name</th>
                      <th className="py-2.5 px-3">Buyer / Student</th>
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        LE PHARAOHS TOUR
                        <span className="block text-[10px] font-mono text-zinc-400">Ref: #TX-90214</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-200">
                        Dimas Anggara
                        <span className="block text-[10px] text-zinc-500">student@its.ac.id</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-medium">VIP Early Access</td>
                      <td className="py-3 px-3 text-center font-bold text-white">2</td>
                      <td className="py-3 px-3 font-semibold text-white">$100.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-zinc-400 hover:text-white transition-colors" title="View receipt">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        SOUND OF HERACLES
                        <span className="block text-[10px] font-mono text-zinc-400">Ref: #TX-90212</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-200">
                        Nadia Larasati
                        <span className="block text-[10px] text-zinc-500">nadia.l@gmail.com</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-medium">General Moshpit</td>
                      <td className="py-3 px-3 text-center font-bold text-white">1</td>
                      <td className="py-3 px-3 font-semibold text-white">$45.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-zinc-400 hover:text-white transition-colors" title="View receipt">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        LE PHARAOHS TOUR
                        <span className="block text-[10px] font-mono text-zinc-400">Ref: #TX-90209</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-200">
                        Rizky Pratama
                        <span className="block text-[10px] text-zinc-500">rizky.p@unair.ac.id</span>
                      </td>
                      <td className="py-3 px-3 text-zinc-300 font-medium">Student Pass</td>
                      <td className="py-3 px-3 text-center font-bold text-white">4</td>
                      <td className="py-3 px-3 font-semibold text-white">$140.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-zinc-400 hover:text-white transition-colors" title="View receipt">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar Feeds & Quick Gate Tools (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Quick QR Gate Scanner Widget */}
            <div className="bg-[#121216] border border-white/10 text-white rounded-2xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Gate Operations
                </span>
                <span className="flex items-center gap-1 text-[11px] bg-red-950/60 border border-red-500/30 text-red-300 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live Scanner
                </span>
              </div>
              <div>
                <h4 className="font-display text-xl uppercase tracking-wide">Quick QR Gate Check-In</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Ready for Gate A • Turnstile Scanner #3</p>
              </div>

              {/* Scanner Graphic Simulation */}
              <div
                onClick={() => setIsScannerActive(!isScannerActive)}
                className="w-full h-44 bg-black/60 border border-white/10 rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group cursor-pointer hover:border-white/20 transition-all"
              >
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-2xl relative">
                  <QrCode className="w-12 h-12 text-zinc-300 group-hover:scale-110 transition-transform" />
                  {/* Scanner Bar Animation */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] animate-bounce" />
                </div>
                <span className="mt-3 text-[11px] text-zinc-400 group-hover:text-white transition-colors">
                  {isScannerActive ? 'Camera scanner active (Click to pause)' : 'Click to launch camera viewfinder'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-zinc-400">Checked-in today:</span>
                <span className="font-bold text-white text-sm font-mono">842 / 1,200</span>
              </div>
            </div>

            {/* Real-Time Activity Stream */}
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-xl uppercase tracking-wide text-white">
                  Live Activity Stream
                </h4>
                <Activity className="w-4 h-4 text-zinc-400" />
              </div>

              <div className="flex flex-col gap-4 relative">
                {/* Timeline item 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">Gate Check-in Confirmed</span>
                    <span className="text-[11px] text-zinc-400 truncate">Pass #VT-1149 • Lapangan Merah</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">2 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">2x VIP Tickets Purchased</span>
                    <span className="text-[11px] text-zinc-400 truncate">Dimas Anggara • $100.00</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">7 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">Tier 2 Capacity Updated</span>
                    <span className="text-[11px] text-zinc-400 truncate">SOUND OF HERACLES (+100 Passes)</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">28 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 4 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-white truncate">Gate Check-in Confirmed</span>
                    <span className="text-[11px] text-zinc-400 truncate">Pass #VT-1148 • Gedung Serbaguna</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">34 mins ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Committee & Team Members Widget */}
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-xl uppercase tracking-wide text-white">
                    VoiceTech Committee
                  </h4>
                  <p className="text-xs text-zinc-400">Active staging personnel</p>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition-colors"
                  title="Add Member"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center">
                      AG
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">
                        Akila Gimhana
                      </span>
                      <span className="text-[10px] text-zinc-400">Lead Organizer (You)</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center">
                      TF
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">
                        Tariq Faleel
                      </span>
                      <span className="text-[10px] text-zinc-400">Sound & Stage Crew</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white font-bold text-xs flex items-center justify-center">
                      DW
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block leading-tight">
                        Danushka W.
                      </span>
                      <span className="text-[10px] text-zinc-400">Gate A Supervisor</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
