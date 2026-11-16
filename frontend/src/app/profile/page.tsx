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
import { CreateEventModal } from '@/components/events/create-event-modal';
import { MyEventsList } from '@/components/events/my-events-list';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ReturnToAdmin } from '@/components/admin/return-to-admin';
import { EventCalendar } from '@/components/shared/event-calendar';

type RoleView = 'USER' | 'STUDENT' | 'ORGANIZER' | 'ADMIN';
type TabType = 'overview' | 'my-events' | 'sales' | 'attendees' | 'saved' | 'settings';

const ROLE_VIEWS: RoleView[] = ['USER', 'STUDENT', 'ORGANIZER', 'ADMIN'];

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

  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSwitchingToAdmin, setIsSwitchingToAdmin] = useState(false);

  const profileQuery = useQuery({
    // Keyed by account so a different sign-in never reuses cached data.
    queryKey: ['user', 'profile', user?.userId],
    queryFn: userApi.getProfile,
    // Fire immediately on page load; a 401 also drives the redirect.
    enabled: status !== 'guest' && !isSwitchingToAdmin,
    // Always ask the backend when the page is opened.
    staleTime: 0,
    retry: false,
  });

  const profile = profileQuery.data;
  const errorStatus = (profileQuery.error as { status?: number } | null)?.status;

  const actualRole = profile?.role || user?.roleId || 'USER';
  const roleView: RoleView = user?.adminUserMode ? 'USER' : ROLE_VIEWS.includes(actualRole as RoleView)
    ? (actualRole as RoleView)
    : 'USER';

  const [activeRoleView, setActiveRoleView] = useState<RoleView>(roleView);
  const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [myEventCount, setMyEventCount] = useState(0);
  const [isScannerActive, setIsScannerActive] = useState(false);

  // Keep the switcher on the real role once the profile response arrives.
  useEffect(() => {
    setActiveRoleView(roleView);
  }, [roleView]);

  // A page visit without a session goes straight back to sign-in.
  useEffect(() => {
    if (status === 'guest' && !isSwitchingToAdmin) {
      router.replace('/login');
    }
  }, [status, router, isSwitchingToAdmin]);

  // The profile endpoint also rejects stale sessions.
  useEffect(() => {
    if (errorStatus === 401 && !isSwitchingToAdmin) {
      router.replace('/login');
    }
  }, [errorStatus, router, isSwitchingToAdmin]);

  const displayName = profile?.name || getDisplayName(user);
  const email = profile?.email || user?.email;
  const mobile = profile?.mobile;
  const joinedDate = formatJoinedDate(profile?.registeredDate);
  const roleLabel = user?.adminUserMode ? 'User mode · own account' : getRoleLabel(actualRole);
  const showCreateEvent = !user?.adminUserMode && canCreateEvents(actualRole);

  // Organizers and admins manage events; everyone else browses saved events.
  const isOrganizer = actualRole === 'ORGANIZER' || actualRole === 'ADMIN';
  const enabledTabs: TabType[] = isOrganizer ? ['my-events', 'overview', 'settings'] : ['saved'];
  const selectedTab: TabType = activeTab ?? (isOrganizer ? 'my-events' : 'saved');
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
    ADMIN: 'Administrator account. Open the administration workspace for platform management.',
  };

  return (
    <div className="relative min-h-screen bg-[#f7f5f4] text-[#1c1b1b] pt-20 pb-20">
      {actualRole === 'ADMIN' && (
        <section className="w-full bg-[#ede9e8] border-b border-[#ddd8d6] py-2 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-2">
            {user?.adminUserMode && <ReturnToAdmin onSwitching={setIsSwitchingToAdmin} />}
            {!user?.adminUserMode && (
              <Link href="/admin" className="px-3.5 py-1 rounded-full bg-[#1c1b1b] text-white text-xs font-semibold uppercase shrink-0">
                Admin dashboard
              </Link>
            )}
          </div>
        </section>
      )}
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
              <button
                type="button"
                onClick={() => setIsCreateEventOpen(true)}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-[#1c1b1b] text-white hover:bg-[#333131] font-bold text-xs tracking-wider transition-all shadow-md flex items-center justify-center gap-2 group"
              >
                <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform text-white" />
                + Create Event
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Strip */}
        <div className="w-full bg-white rounded-2xl p-1.5 shadow-sm border border-[#eae6e5] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'my-events', label: `My Events (${myEventCount})` },
            { id: 'sales', label: 'Ticket Sales & Gate' },
            { id: 'attendees', label: 'Attendees Roster' },
            { id: 'saved', label: 'Saved Events' },
            { id: 'settings', label: 'Settings & Payouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={!enabledTabs.includes(tab.id as TabType)}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#635f5e] ${
                selectedTab === tab.id
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
            <MyEventsList onCountChange={setMyEventCount} />
          </div>

          {/* Right Column: Sidebar Feeds & Quick Gate Tools (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Registered events and today */}
            <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">Total registered events</p>
                <p className="mt-2 font-display text-5xl text-[#1c1b1b]">{myEventCount}</p>
                <p className="mt-1 text-xs text-[#736e6c]">Events you have published</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0eceb] text-[#1c1b1b]">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <EventCalendar />
            {/* Organization details submitted with the account */}
            <div className="bg-white border border-[#eae6e5] rounded-2xl p-5 shadow-sm flex flex-col gap-3.5">
              <div>
                <h4 className="font-display text-xl uppercase tracking-wide text-[#1c1b1b]">Organization</h4>
                <p className="text-xs text-[#736e6c]">Details submitted with your account</p>
              </div>
              {profile.organization ? (
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">Name</dt>
                    <dd className="font-semibold text-[#1c1b1b]">{profile.organization.organizationName ?? '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-[#736e6c]">Position</dt>
                    <dd className="font-semibold text-[#1c1b1b]">{profile.organization.position ?? '-'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[#736e6c]">No organization is linked to this account yet.</p>
              )}
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

      <CreateEventModal
        open={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
      />
    </div>
  );
}
