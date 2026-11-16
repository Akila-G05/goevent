"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import type { Workspace } from "@/api/coordinator";
import { getDisplayName, useSessionStore } from "@/lib/session-store";
import { useLogout } from "@/hooks/use-logout";
import { AccountMenu } from "@/components/shared/account-menu";
import "@/components/admin/admin.css";
import "./coordinator.css";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Events", icon: CalendarDays },
  { name: "Organization access", icon: Building2 },
  { name: "Participant emails", icon: Mail },
] as const;
export type CoordinatorView = (typeof navigation)[number]["name"];

export function CoordinatorShell({
  children,
  workspaces,
  organization,
  view,
  busy,
  canCreate,
  onOrganization,
  onView,
  onCreate,
  onRefresh,
}: {
  children: ReactNode;
  workspaces: Workspace[];
  organization?: number;
  view: CoordinatorView;
  busy: boolean;
  canCreate: boolean;
  onOrganization: (id: number) => void;
  onView: (view: CoordinatorView) => void;
  onCreate: () => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const user = useSessionStore((state) => state.user);
  const name = getDisplayName(user);
  const workspace = workspaces.find(
    (item) => item.organization_id === organization,
  );
  const currentView = workspace ? view : "Organization access";
  const router = useRouter();
  const { logout, isLoggingOut } = useLogout();
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  function navigate(next: CoordinatorView) {
    onView(next);
    setOpen(false);
  }
  async function signOut() {
    await logout();
    if (useSessionStore.getState().status === "guest")
      router.replace("/login?returnTo=%2Fcoordinator");
  }
  return (
    <div className="admin-app coordinator-app">
      <a href="#coordinator-content" className="coordinator-skip">
        Skip to workspace
      </a>
      {open && (
        <button
          className="coordinator-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="coordinator-sidebar"
        className={`admin-sidebar coordinator-sidebar ${open ? "open" : ""}`}
      >
        <Link href="/" className="admin-brand" aria-label="GoEvent home">
          <span className="admin-brand-slashes" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <span className="admin-wordmark">GOEVENT</span>
            <span className="admin-brand-caption">Coordinator workspace</span>
          </span>
        </Link>
        <div className="coordinator-workspace-picker">
          <label htmlFor="coordinator-organization" className="admin-eyebrow">
            Organization workspace
          </label>
          <select
            id="coordinator-organization"
            className="admin-input"
            aria-label="Organization workspace"
            value={organization || ""}
            disabled={busy || !workspaces.length}
            onChange={(event) => {
              onOrganization(Number(event.target.value));
              setOpen(false);
            }}
          >
            <option value="" disabled>
              {workspaces.length ? "Select organization" : "Approval required"}
            </option>
            {workspaces.map((item) => (
              <option key={item.id} value={item.organization_id}>
                {item.name}
              </option>
            ))}
          </select>
          {workspace && (
            <p className="coordinator-position">{workspace.position}</p>
          )}
        </div>
        <nav
          className="admin-nav coordinator-nav"
          aria-label="Coordinator navigation"
        >
          <p className="admin-eyebrow">Workspace</p>
          {navigation.map(({ name: item, icon: Icon }) => (
            <button
              key={item}
              type="button"
              aria-current={currentView === item ? "page" : undefined}
              disabled={!workspace && item !== "Organization access"}
              onClick={() => navigate(item)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom coordinator-account">
          <AccountMenu
            actor={{ name, email: user?.email }}
            label="Coordinator"
            busy={busy || isLoggingOut}
            onSwitch={() => router.push("/profile")}
            onLogout={() => void signOut()}
          />
        </div>
      </aside>
      <main
        id="coordinator-content"
        className="admin-main coordinator-main"
        tabIndex={-1}
      >
        <header className="admin-top coordinator-top">
          <div className="coordinator-heading">
            <button
              ref={trigger}
              type="button"
              className="admin-btn admin-mobile-toggle"
              aria-label={
                open
                  ? "Close coordinator navigation"
                  : "Open coordinator navigation"
              }
              aria-controls="coordinator-sidebar"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
            <div>
              <p className="admin-eyebrow">
                Coordinator dashboard <span aria-hidden="true"> / </span>{" "}
                {workspace?.name || "Organization access"}
              </p>
              <h1>
                {currentView}
                <span className="admin-title-dot" aria-hidden="true" />
              </h1>
            </div>
          </div>
          <div className="admin-tools coordinator-top-tools">
            <Link href="/events" className="coordinator-public-link">
              View events
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="admin-btn"
              aria-label="Refresh workspace"
              title="Refresh workspace"
              disabled={busy}
              onClick={onRefresh}
            >
              <RefreshCw size={14} />
              <span className="coordinator-refresh-label">Refresh</span>
            </button>
            {workspace ? (
              <button
                type="button"
                className="admin-btn primary"
                disabled={busy || !canCreate}
                onClick={onCreate}
              >
                <Plus size={15} aria-hidden="true" />
                Create event
              </button>
            ) : (
              <button
                type="button"
                className="admin-btn primary"
                onClick={() => navigate("Organization access")}
              >
                <Plus size={15} aria-hidden="true" />
                Request access
              </button>
            )}
          </div>
        </header>
        {children}
        <footer className="coordinator-footer">
          <span>GOEVENT · COORDINATOR</span>
          <span>
            {workspace
              ? `Your events in ${workspace.name}`
              : "One account. Reviewed organization access."}
          </span>
        </footer>
      </main>
    </div>
  );
}
