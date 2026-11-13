'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  RefreshCw,
} from 'lucide-react';
import { userApi, resolveProfileImageUrl } from '@/api';
import {
  useSessionStore,
  getDisplayName,
  getRoleLabel,
  canCreateEvents,
} from '@/lib/session-store';
import { useLogout } from '@/hooks/use-logout';
import { useMinimumLoading } from '@/hooks/use-minimum-loading';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';

type RoleView = 'USER' | 'STUDENT' | 'ORGANIZER' | 'ADMIN' | 'CONTRIBUTOR';
type TabType = 'overview' | 'my-events' | 'sales' | 'attendees' | 'saved' | 'settings';

const ROLE_VIEWS: RoleView[] = ['USER', 'STUDENT', 'ORGANIZER', 'ADMIN', 'CONTRIBUTOR'];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatJoinedDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;

  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }

  return `${MONTHS[monthIndex]} ${year}`;
}

function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      className="relative min-h-screen bg-[#f7f5f4] pb-20 pt-20 text-[#1c1b1b]"
    >
      <div className="w-full border-b border-[#ddd8d6] bg-[#ede9e8] px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto h-6 w-64 max-w-full animate-pulse rounded-full bg-[#ded9d7]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-44 w-full animate-pulse rounded-3xl border border-[#eae6e5] bg-white" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <div
              key={card}
              className="h-32 animate-pulse rounded-2xl border border-[#eae6e5] bg-white"
            />
          ))}
        </div>

        <div className="h-12 w-full animate-pulse rounded-2xl border border-[#eae6e5] bg-white" />
      </div>
    </div>
  );
}

function ProfileErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f7f5f4] px-4 pb-20 pt-20 text-[#1c1b1b]">
      <div className="w-full max-w-md rounded-3xl border border-[#eae6e5] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0eceb] text-[#1c1b1b]">
          <RefreshCw className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl uppercase tracking-wide">
          Could not load your profile
        </h1>
        <p className="mt-2 text-sm text-[#736e6c]">
          The server did not return your account details. Please try again.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-full bg-[#1c1b1b] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#333131]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const { logout, isLoggingOut } = useLogout();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const profileQuery = useQuery({
    // Keyed by account so a different sign-in never reuses cached data.
    queryKey: ['user', 'profile', user?.userId],
    queryFn: userApi.getProfile,
    // Fire immediately on page load; a 401 also drives the redirect.
    enabled: status !== 'guest',
    // Always ask the backend when the page is opened.
    staleTime: 0,
    retry: false,
  });

  const profile = profileQuery.data;
  const errorStatus = (profileQuery.error as { status?: number } | null)?.status;

  const actualRole = profile?.role || user?.roleId || 'USER';
  const roleView: RoleView = ROLE_VIEWS.includes(actualRole as RoleView)
    ? (actualRole as RoleView)
    : 'USER';

  const [activeRoleView, setActiveRoleView] = useState<RoleView>(roleView);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isScannerActive, setIsScannerActive] = useState(false);

  // Keep the switcher on the real role once the profile response arrives.
  useEffect(() => {
    setActiveRoleView(roleView);
  }, [roleView]);

  // A page visit without a session goes straight back to sign-in.
  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [status, router]);

  // The profile endpoint also rejects stale sessions.
  useEffect(() => {
    if (errorStatus === 401) {
      router.replace('/login');
    }
  }, [errorStatus, router]);

  const displayName = profile?.name || getDisplayName(user);
  const email = profile?.email || user?.email;
  const mobile = profile?.mobile;
  const joinedDate = formatJoinedDate(profile?.registeredDate);
  const roleLabel = getRoleLabel(actualRole);
  const showCreateEvent = canCreateEvents(actualRole);
  const avatarSrc = resolveProfileImageUrl(profile?.profileImgUrl);

  const profileRequestLoading =
    status === 'loading' ||
    (status === 'authenticated' && (profileQuery.isPending || profileQuery.isFetching));

  // The animation stays for at least 500 ms, even if the API answers sooner.
  const showProfileLoading = useMinimumLoading(profileRequestLoading);

  if (showProfileLoading || status === 'guest') {
    return <ProfileSkeleton />;
  }

  // Session expired: the redirect is already in flight.
  if (errorStatus === 401) {
    return <ProfileSkeleton />;
  }

  if (profileQuery.isError) {
    return <ProfileErrorState onRetry={() => profileQuery.refetch()} />;
  }

  // Narrow the response for the rest of the render (and the edit dialog).
  if (!profile) {
    return <ProfileSkeleton />;
  }

  const roleDescriptions: Record<RoleView, string> = {
    USER: 'Viewing as USER. Standard attendee view with ticket booking and pass storage.',
    STUDENT: 'Viewing as STUDENT. University discounts, verified campus credentials, and student passes unlocked.',
    ORGANIZER: 'Viewing as ORGANIZER. Full event publishing, ticket tiers, and gate check-in tools unlocked.',
    ADMIN: 'Viewing as ADMIN. Platform moderation, disputes, and full system management unlocked.',
    CONTRIBUTOR: 'Viewing as CONTRIBUTOR. Event promotion, affiliate links, and commission reporting unlocked.',
  };

  return (
    <div className="relative min-h-screen bg-[#f7f5f4] text-[#1c1b1b] pt-20 pb-20">
      {/* Role Switcher & Environment Bar */}
      <section className="w-full bg-[#ede9e8] border-b border-[#ddd8d6] py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-0.5 no-scrollbar">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#635f5e] mr-2 flex items-center gap-1 shrink-0">
              <Users className="w-3.5 h-3.5" /> Role View:
            </span>
            {(['USER', 'STUDENT', 'ORGANIZER', 'ADMIN', 'CONTRIBUTOR'] as RoleView[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRoleView(r)}
                className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider transition-all uppercase shrink-0 ${
                  activeRoleView === r
                    ? 'bg-[#1c1b1b] text-white shadow-sm font-bold'
                    : 'text-[#635f5e] hover:text-[#1c1b1b] hover:bg-[#ded9d7]'
                }`}
              >
                {r === activeRoleView && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                )}
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1 rounded-full text-[#4a4746] text-xs w-full md:w-auto justify-between md:justify-start shadow-sm border border-[#e2dedd]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1c1b1b] shrink-0" />
              <span className="truncate max-w-md text-[11px] sm:text-xs">
                {roleDescriptions[activeRoleView]}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-[#ede9e8] text-[#1c1b1b] px-2 py-0.5 rounded-full shrink-0">
              Live Mode
            </span>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Profile Header Hero Card */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#eae6e5] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#1c1b1b] border-4 border-[#f0eceb] shadow-md flex items-center justify-center text-3xl font-display font-bold text-white tracking-widest">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  displayName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'AG'
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1c1b1b] text-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wide text-[#1c1b1b]">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1c1b1b] text-white font-bold text-[10px] uppercase tracking-widest">
                  {activeRoleView}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[#4a4746] text-sm font-medium">
                <Users className="w-4 h-4 text-[#1c1b1b] shrink-0" />
                <span>{roleLabel} • GoEvent member</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#736e6c] mt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#918c8a]" /> {email || '—'}
                </span>
                {mobile && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#918c8a]" /> {mobile}
                  </span>
                )}
                {joinedDate && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-[#918c8a]" /> Joined {joinedDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(true)}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-[#f0eceb] hover:bg-[#e4dfde] text-[#1c1b1b] font-semibold text-xs tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            {showCreateEvent && (
              <Link
                href="/#events"
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-[#1c1b1b] text-white hover:bg-[#333131] font-bold text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform text-white" />
                + Create Event
              </Link>
            )}
          </div>
        </div>

        {/* 4 Metric Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#eae6e5] flex flex-col justify-between gap-3 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                Total Published Events
              </span>
              <span className="w-8 h-8 rounded-full bg-[#f5f2f1] flex items-center justify-center text-[#1c1b1b]">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-[#1c1b1b] tracking-wide">14</div>
              <div className="flex items-center gap-1.5 text-xs text-[#736e6c] mt-1">
                <span className="flex items-center text-[#1c1b1b] font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +2
                </span>
                <span>launched this month</span>
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#eae6e5] flex flex-col justify-between gap-3 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                Upcoming Live Tours
              </span>
              <span className="w-8 h-8 rounded-full bg-[#f5f2f1] flex items-center justify-center text-[#1c1b1b]">
                <Radio className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-[#1c1b1b] tracking-wide flex items-center gap-2">
                4
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              </div>
              <div className="text-xs text-[#736e6c] mt-1">Active ticketing & staging</div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#eae6e5] flex flex-col justify-between gap-3 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                Tickets Sold
              </span>
              <span className="w-8 h-8 rounded-full bg-[#f5f2f1] flex items-center justify-center text-[#1c1b1b]">
                <Ticket className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-[#1c1b1b] tracking-wide">3,840</div>
              <div className="flex items-center gap-2 text-xs text-[#736e6c] mt-1.5">
                <div className="w-20 h-1.5 rounded-full bg-[#e8e4e3] overflow-hidden">
                  <div className="h-full bg-[#1c1b1b] rounded-full" style={{ width: '88%' }} />
                </div>
                <span>88% aggregate sell-out</span>
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#eae6e5] flex flex-col justify-between gap-3 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">
                Total Gross Volume
              </span>
              <span className="w-8 h-8 rounded-full bg-[#f5f2f1] flex items-center justify-center text-[#1c1b1b]">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div>
              <div className="font-display text-4xl text-[#1c1b1b] tracking-wide">$68.4K</div>
              <div className="text-xs text-[#736e6c] mt-1">
                <span>3,420 checked-in via Gate QR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Strip */}
        <div className="w-full bg-white rounded-2xl p-1.5 shadow-sm border border-[#eae6e5] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                  ? 'bg-[#1c1b1b] text-white font-bold shadow-sm'
                  : 'text-[#635f5e] hover:text-[#1c1b1b] hover:bg-[#f5f2f1]'
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
            <div className="bg-white border border-[#eae6e5] p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
              <span className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">
                Quick Actions
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerActive(!isScannerActive)}
                  className="px-3.5 py-1.5 rounded-full bg-[#f5f2f1] hover:bg-[#ebe6e5] text-[#1c1b1b] text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <ScanLine className="w-3.5 h-3.5 text-[#1c1b1b]" /> Fast Scanner
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-[#f5f2f1] hover:bg-[#ebe6e5] text-[#1c1b1b] text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#1c1b1b]" /> Attendee Pass
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-[#f5f2f1] hover:bg-[#ebe6e5] text-[#1c1b1b] text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1c1b1b]" /> Sales Report
                </button>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-full bg-[#f5f2f1] hover:bg-[#ebe6e5] text-[#1c1b1b] text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#1c1b1b]" /> Export CSV
                </button>
              </div>
            </div>

            {/* Upcoming Published Events Section */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl uppercase tracking-wide text-[#1c1b1b]">
                    Live Tour Dates & Events
                  </h2>
                  <p className="text-xs text-[#736e6c]">
                    Real-time capacity monitor and check-in velocity.
                  </p>
                </div>
                <Link
                  href="/#events"
                  className="text-xs font-bold uppercase tracking-wider text-[#1c1b1b] hover:underline transition-colors flex items-center gap-1"
                >
                  View All (14) <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Event 1 Card */}
              <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5 hover:shadow-md transition-all relative overflow-hidden">
                <div className="w-full md:w-56 h-44 rounded-xl overflow-hidden shrink-0 relative bg-[#f5f2f1]">
                  <img
                    src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80"
                    alt="LE PHARAOHS TOUR"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 z-20 bg-[#1c1b1b] text-white px-2.5 py-1 rounded-lg text-center leading-none shadow-md">
                    <span className="block text-[10px] font-bold text-red-400">MAY</span>
                    <span className="font-display text-lg">18</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] uppercase font-bold tracking-wider">
                        SELLING FAST
                      </span>
                      <span className="text-[11px] text-[#736e6c] font-mono">Ref: #EVT-4819</span>
                    </div>
                    <h3 className="font-display text-2xl uppercase text-[#1c1b1b] tracking-wide">
                      LE PHARAOHS X SERKONSER TOUR
                    </h3>
                    <div className="flex items-center gap-1.5 text-[#736e6c] text-xs">
                      <MapPin className="w-3.5 h-3.5 text-[#918c8a]" />
                      <span>Lapangan Merah, Surabaya • Main Stage A</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 bg-[#f7f5f4] p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1c1b1b] font-semibold">Tickets Sold: 820 / 1,000</span>
                      <span className="text-[#1c1b1b] font-bold">82% Filled</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#e8e4e3] overflow-hidden">
                      <div className="h-full bg-[#1c1b1b] rounded-full" style={{ width: '82%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#736e6c] font-mono">
                      <span>Gross: $41,000</span>
                      <span>180 Passes remaining</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#e4dfde] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1c1b1b]">AK</div>
                      <div className="w-7 h-7 rounded-full bg-[#d6d0cf] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1c1b1b]">JD</div>
                      <div className="w-7 h-7 rounded-full bg-[#b8b0af] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+818</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-[#f0eceb] hover:bg-[#e4dfde] text-[#1c1b1b] text-xs font-semibold transition-all"
                      >
                        View 820 Attendees
                      </button>
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-[#1c1b1b] text-white hover:bg-[#333131] text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        Manage Event <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event 2 Card */}
              <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5 hover:shadow-md transition-all relative overflow-hidden">
                <div className="w-full md:w-56 h-44 rounded-xl overflow-hidden shrink-0 relative bg-[#f5f2f1]">
                  <img
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80"
                    alt="SOUND OF HERACLES METAL FEST"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 z-20 bg-[#1c1b1b] text-white px-2.5 py-1 rounded-lg text-center leading-none shadow-md">
                    <span className="block text-[10px] font-bold text-purple-300">JUN</span>
                    <span className="font-display text-lg">24</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-[#ede9e8] text-[#1c1b1b] text-[10px] uppercase font-bold tracking-wider">
                        PUBLISHED • TIER 2
                      </span>
                      <span className="text-[11px] text-[#736e6c] font-mono">Ref: #EVT-4932</span>
                    </div>
                    <h3 className="font-display text-2xl uppercase text-[#1c1b1b] tracking-wide">
                      SOUND OF HERACLES METAL FEST
                    </h3>
                    <div className="flex items-center gap-1.5 text-[#736e6c] text-xs">
                      <MapPin className="w-3.5 h-3.5 text-[#918c8a]" />
                      <span>Gedung Serbaguna, Surabaya • Indoor Arena</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex flex-col gap-1.5 bg-[#f7f5f4] p-3 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1c1b1b] font-semibold">Tickets Sold: 540 / 600</span>
                      <span className="text-[#1c1b1b] font-bold">90% Filled</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#e8e4e3] overflow-hidden">
                      <div className="h-full bg-[#1c1b1b] rounded-full" style={{ width: '90%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#736e6c] font-mono">
                      <span>Gross: $27,000</span>
                      <span>60 VIP Passes left</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-[#e4dfde] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1c1b1b]">MR</div>
                      <div className="w-7 h-7 rounded-full bg-[#d6d0cf] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1c1b1b]">SL</div>
                      <div className="w-7 h-7 rounded-full bg-[#b8b0af] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">+538</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-[#f0eceb] hover:bg-[#e4dfde] text-[#1c1b1b] text-xs font-semibold transition-all"
                      >
                        View 540 Attendees
                      </button>
                      <button
                        type="button"
                        className="px-4 py-1.5 rounded-full bg-[#1c1b1b] text-white hover:bg-[#333131] text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                      >
                        Manage Event <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">
                    Recent Booking & Ticket Sales
                  </h3>
                  <p className="text-xs text-[#736e6c]">
                    Real-time attendee transactions processed via GoEvent Gateway.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-[#736e6c] bg-[#f5f2f1] px-3 py-1 rounded-full w-max border border-[#e8e4e3]">
                  Auto-refresh: 10s
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f5f2f1] text-[#635f5e] uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-2.5 px-3 rounded-l-lg">Event Name</th>
                      <th className="py-2.5 px-3">Buyer / Student</th>
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eceb]">
                    <tr className="hover:bg-[#fcfaf9] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">
                        LE PHARAOHS TOUR
                        <span className="block text-[10px] font-mono text-[#736e6c]">Ref: #TX-90214</span>
                      </td>
                      <td className="py-3 px-3 text-[#1c1b1b]">
                        Dimas Anggara
                        <span className="block text-[10px] text-[#736e6c]">student@its.ac.id</span>
                      </td>
                      <td className="py-3 px-3 text-[#4a4746] font-medium">VIP Early Access</td>
                      <td className="py-3 px-3 text-center font-bold text-[#1c1b1b]">2</td>
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">$100.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#dbe4ed] text-[#141d23] text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-[#141d23]" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-[#736e6c] hover:text-[#1c1b1b] transition-colors" title="View receipt">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#fcfaf9] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">
                        SOUND OF HERACLES
                        <span className="block text-[10px] font-mono text-[#736e6c]">Ref: #TX-90212</span>
                      </td>
                      <td className="py-3 px-3 text-[#1c1b1b]">
                        Nadia Larasati
                        <span className="block text-[10px] text-[#736e6c]">nadia.l@gmail.com</span>
                      </td>
                      <td className="py-3 px-3 text-[#4a4746] font-medium">General Moshpit</td>
                      <td className="py-3 px-3 text-center font-bold text-[#1c1b1b]">1</td>
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">$45.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#dbe4ed] text-[#141d23] text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-[#141d23]" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-[#736e6c] hover:text-[#1c1b1b] transition-colors" title="View receipt">
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#fcfaf9] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">
                        LE PHARAOHS TOUR
                        <span className="block text-[10px] font-mono text-[#736e6c]">Ref: #TX-90209</span>
                      </td>
                      <td className="py-3 px-3 text-[#1c1b1b]">
                        Rizky Pratama
                        <span className="block text-[10px] text-[#736e6c]">rizky.p@unair.ac.id</span>
                      </td>
                      <td className="py-3 px-3 text-[#4a4746] font-medium">Student Pass</td>
                      <td className="py-3 px-3 text-center font-bold text-[#1c1b1b]">4</td>
                      <td className="py-3 px-3 font-semibold text-[#1c1b1b]">$140.00</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#dbe4ed] text-[#141d23] text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-[#141d23]" /> Paid
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button type="button" className="p-1 text-[#736e6c] hover:text-[#1c1b1b] transition-colors" title="View receipt">
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
            {/* Quick QR Gate Scanner Widget - Dark accent style from screenshot */}
            <div className="bg-[#1c1b1b] text-white rounded-2xl p-5 shadow-md flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#a8a4a3]">
                  Gate Operations
                </span>
                <span className="flex items-center gap-1 text-[11px] bg-red-950/80 border border-red-500/40 text-red-200 px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live Scanner
                </span>
              </div>
              <div>
                <h4 className="font-display text-xl uppercase tracking-wide">Quick QR Gate Check-In</h4>
                <p className="text-xs text-[#a8a4a3] mt-0.5">Ready for Gate A • Turnstile Scanner #3</p>
              </div>

              {/* Scanner Graphic Simulation */}
              <div
                onClick={() => setIsScannerActive(!isScannerActive)}
                className="w-full h-44 bg-[#2b2a29] rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group cursor-pointer hover:bg-[#363534] transition-all"
              >
                <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center text-[#1c1b1b] shadow-xl relative">
                  <QrCode className="w-12 h-12 text-[#1c1b1b] group-hover:scale-110 transition-transform" />
                  {/* Scanner Bar Animation */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.9)] animate-bounce" />
                </div>
                <span className="mt-3 text-[11px] text-[#a8a4a3] group-hover:text-white transition-colors">
                  {isScannerActive ? 'Camera scanner active (Click to pause)' : 'Click to launch camera viewfinder'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                <span className="text-[#a8a4a3]">Checked-in today:</span>
                <span className="font-bold text-white text-sm font-mono">842 / 1,200</span>
              </div>
            </div>

            {/* Real-Time Activity Stream */}
            <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">
                  Live Activity Stream
                </h4>
                <Activity className="w-4 h-4 text-[#736e6c]" />
              </div>

              <div className="flex flex-col gap-4 relative">
                {/* Timeline item 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#dbe4ed] text-[#141d23] flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#1c1b1b] truncate">Gate Check-in Confirmed</span>
                    <span className="text-[11px] text-[#736e6c] truncate">Pass #VT-1149 • Lapangan Merah</span>
                    <span className="text-[10px] text-[#918c8a] mt-0.5">2 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f0eceb] text-[#1c1b1b] flex items-center justify-center shrink-0 mt-0.5">
                    <Ticket className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#1c1b1b] truncate">2x VIP Tickets Purchased</span>
                    <span className="text-[11px] text-[#736e6c] truncate">Dimas Anggara • $100.00</span>
                    <span className="text-[10px] text-[#918c8a] mt-0.5">7 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f0eceb] text-[#1c1b1b] flex items-center justify-center shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#1c1b1b] truncate">Tier 2 Capacity Updated</span>
                    <span className="text-[11px] text-[#736e6c] truncate">SOUND OF HERACLES (+100 Passes)</span>
                    <span className="text-[10px] text-[#918c8a] mt-0.5">28 mins ago</span>
                  </div>
                </div>

                {/* Timeline item 4 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#dbe4ed] text-[#141d23] flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#1c1b1b] truncate">Gate Check-in Confirmed</span>
                    <span className="text-[11px] text-[#736e6c] truncate">Pass #VT-1148 • Gedung Serbaguna</span>
                    <span className="text-[10px] text-[#918c8a] mt-0.5">34 mins ago</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Committee & Team Members Widget */}
            <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">
                    VoiceTech Committee
                  </h4>
                  <p className="text-xs text-[#736e6c]">Active staging personnel</p>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-[#f5f2f1] hover:bg-[#ebe6e5] text-[#1c1b1b] flex items-center justify-center transition-colors"
                  title="Add Member"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f7f5f4] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1c1b1b] text-white font-bold text-xs flex items-center justify-center">
                      AG
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1c1b1b] block leading-tight">
                        Akila Gimhana
                      </span>
                      <span className="text-[10px] text-[#736e6c]">Lead Organizer (You)</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#1c1b1b]" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f7f5f4] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f0eceb] text-[#1c1b1b] font-bold text-xs flex items-center justify-center">
                      TF
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1c1b1b] block leading-tight">
                        Tariq Faleel
                      </span>
                      <span className="text-[10px] text-[#736e6c]">Sound & Stage Crew</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#1c1b1b]" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f7f5f4] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#f0eceb] text-[#1c1b1b] font-bold text-xs flex items-center justify-center">
                      DW
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1c1b1b] block leading-tight">
                        Danushka W.
                      </span>
                      <span className="text-[10px] text-[#736e6c]">Gate A Supervisor</span>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#1c1b1b]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        open={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        profile={profile}
        onSaved={(updated) => {
          queryClient.setQueryData(['user', 'profile', user?.userId], updated);
          void useSessionStore.getState().refresh();
        }}
      />
    </div>
  );
}
