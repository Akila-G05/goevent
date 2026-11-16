import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CoordinatorPage from "@/app/coordinator/page";
import { coordinatorApi } from "@/api/coordinator";
import { authApi } from "@/api";
import { useSessionStore } from "@/lib/session-store";
const route = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => route }));
function show() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CoordinatorPage />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.restoreAllMocks();
  route.push.mockClear();
  route.replace.mockClear();
  useSessionStore.getState().clear();
});

function mockApprovedWorkspace() {
  return vi.spyOn(coordinatorApi, "get").mockImplementation(async (path) => {
    if (path === "eligibility")
      return [{ id: 1, organization_id: 10, name: "Alpha", position: "Chair" }];
    if (path === "catalog")
      return {
        categories: [],
        organizations: [
          { id: 10, name: "Alpha" },
          { id: 20, name: "Old committee" },
        ],
        organizationTypes: [],
        universities: [],
      };
    if (path === "applications")
      return [
        {
          id: 2,
          organization_id: 20,
          proposed_name: null,
          position: "Former chair",
          status_id: 2,
          decision_reason: "Historical access",
          revoked_at: null,
          proof_id: null,
        },
      ];
    if (path.endsWith("/statistics"))
      return {
        selectedEventId: null,
        eventStates: [],
        ticketQuantities: { booked_quantity: "0", invalid_quantities: 0 },
        events: 0,
        bookings: 0,
        impressions: { measured: null },
        packages: [],
        payments: [],
        unavailableHistory: { bookings_without_time: 0 },
        notice: "Historical impressions unavailable",
      };
    return [];
  });
}

describe("Coordinator dashboard", () => {
  it("routes guests to login with a coordinator return destination", async () => {
    vi.spyOn(coordinatorApi, "get").mockRejectedValue({
      status: 401,
      message: "Login required",
    });
    show();
    await waitFor(() =>
      expect(route.replace).toHaveBeenCalledWith(
        "/login?returnTo=%2Fcoordinator",
      ),
    );
  });
  it("offers verification without global-role assumptions or approval deadlines", async () => {
    vi.spyOn(coordinatorApi, "get").mockImplementation(async (path) =>
      path === "catalog"
        ? {
            categories: [],
            organizations: [{ id: 1, name: "Committee" }],
            organizationTypes: [],
            universities: [],
          }
        : [],
    );
    show();
    expect(
      await screen.findByRole("heading", {
        name: "Request organization access",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Private authorization letter/),
    ).toBeRequired();
    expect(screen.getByText(/review times vary/)).toBeInTheDocument();
  });
  it("switches organization scopes and uses recorded empty statistics", async () => {
    const get = vi
      .spyOn(coordinatorApi, "get")
      .mockImplementation(async (path) => {
        if (path === "eligibility")
          return [
            { id: 1, organization_id: 10, name: "Alpha", position: "Chair" },
            { id: 2, organization_id: 20, name: "Beta", position: "Chair" },
          ];
        if (path === "catalog")
          return {
            categories: [],
            organizations: [],
            organizationTypes: [],
            universities: [],
          };
        if (path.endsWith("/statistics"))
          return {
            selectedEventId: null,
            eventStates: [],
            ticketQuantities: { booked_quantity: "0", invalid_quantities: 0 },
            events: 0,
            bookings: 0,
            impressions: { measured: null },
            packages: [],
            payments: [],
            unavailableHistory: { bookings_without_time: 0 },
            notice: "Historical impressions unavailable",
          };
        return [];
      });
    show();
    await screen.findByText("Measured impressions");
    expect(
      within(
        screen.getByText("Measured impressions").closest("article")!,
      ).getByText("Unavailable"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Organization workspace"), {
      target: { value: "20" },
    });
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        "workspaces/20/statistics",
        expect.any(Object),
      ),
    );
  });

  it("uses the admin shell and shows payments while keeping package reports collapsed", async () => {
    mockApprovedWorkspace();
    show();
    await screen.findByText("Measured impressions");
    expect(
      document.querySelector(".admin-sidebar.coordinator-sidebar"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GoEvent home" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByText("Recorded payment amounts").closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByText("Recorded package bookings").closest("details"),
    ).not.toHaveAttribute("open");
    fireEvent.click(screen.getByRole("button", { name: /Account:/ }));
    expect(
      screen.getByRole("menuitem", { name: "Switch to user" }),
    ).toBeInTheDocument();
  });
  it("opens navigation and returns keyboard focus when dismissed with Escape", async () => {
    mockApprovedWorkspace();
    show();
    await screen.findByText("Measured impressions");
    const toggle = screen.getByRole("button", {
      name: "Open coordinator navigation",
    });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });
  it("offers an older organization for reapplication without listing it as an approved workspace", async () => {
    mockApprovedWorkspace();
    show();
    await screen.findByText("Measured impressions");
    fireEvent.click(
      within(
        screen.getByRole("navigation", { name: "Coordinator navigation" }),
      ).getByRole("button", { name: "Organization access" }),
    );
    expect(
      await screen.findByText("Revoked · Former chair"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Organization"), {
      target: { value: "20" },
    });
    expect(screen.getByLabelText("Organization")).toHaveValue("20");
    expect(
      screen.getByLabelText(/Private authorization letter/),
    ).toBeRequired();
    expect(
      within(screen.getByLabelText("Organization workspace")).queryByRole(
        "option",
        { name: "Old committee" },
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps account actions in the popup and switches to the personal profile", async () => {
    mockApprovedWorkspace();
    useSessionStore
      .getState()
      .setAuthenticated({
        userId: 7,
        name: "Coordinator fixture",
        email: "fixture@example.invalid",
      });
    show();
    await screen.findByText("Measured impressions");
    expect(
      screen.queryByText(
        "Access is approved separately for each organization.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "Account: Coordinator fixture",
    });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Switch to user" }));
    expect(route.push).toHaveBeenCalledWith("/profile");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
  it("closes the account popup before closing the mobile navigation on Escape", async () => {
    mockApprovedWorkspace();
    show();
    await screen.findByText("Measured impressions");
    const nav = screen.getByRole("button", {
      name: "Open coordinator navigation",
    });
    fireEvent.click(nav);
    const account = screen.getByRole("button", { name: /Account:/ });
    fireEvent.click(account);
    fireEvent.keyDown(
      screen.getByRole("menuitem", { name: "Switch to user" }),
      { key: "Escape" },
    );
    expect(account).toHaveFocus();
    expect(nav).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(nav).toHaveAttribute("aria-expanded", "false");
  });
  it("logs out through the existing handler and only redirects after confirmation", async () => {
    mockApprovedWorkspace();
    useSessionStore
      .getState()
      .setAuthenticated({ userId: 7, name: "Coordinator fixture" });
    const logout = vi
      .spyOn(authApi, "logout")
      .mockResolvedValue({ status: true, message: "Signed out" });
    show();
    await screen.findByText("Measured impressions");
    fireEvent.click(screen.getByRole("button", { name: /Account:/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() =>
      expect(route.replace).toHaveBeenCalledWith(
        "/login?returnTo=%2Fcoordinator",
      ),
    );
    expect(logout).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().status).toBe("guest");
  });
  it("keeps the current session when logout fails", async () => {
    mockApprovedWorkspace();
    useSessionStore
      .getState()
      .setAuthenticated({ userId: 7, name: "Coordinator fixture" });
    const logout = vi
      .spyOn(authApi, "logout")
      .mockRejectedValue({ message: "Unavailable" });
    show();
    await screen.findByText("Measured impressions");
    fireEvent.click(screen.getByRole("button", { name: /Account:/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
    expect(route.replace).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe("authenticated");
  });
  it("loads individual-event statistics and clears that selection on organization switch", async () => {
    const event = {
      id: 101,
      name: "Conference",
      revision: 1,
      event_status_id: 2,
      phase: "UPCOMING",
      timezone: "Asia/Colombo",
      starts_at: null,
      ends_at: null,
      review_state: "APPROVED",
      reason: null,
      disabled_at: null,
      published_revision_id: 1,
      working_revision_id: 1,
    };
    const get = vi
      .spyOn(coordinatorApi, "get")
      .mockImplementation(async (path, params) => {
        if (path === "eligibility")
          return [
            { id: 1, organization_id: 10, name: "Alpha", position: "Chair" },
            { id: 2, organization_id: 20, name: "Beta", position: "Chair" },
          ];
        if (path === "catalog")
          return {
            categories: [],
            organizations: [],
            organizationTypes: [],
            universities: [],
          };
        if (path.endsWith("/events"))
          return path.startsWith("workspaces/10") ? [event] : [];
        if (path.endsWith("/statistics"))
          return {
            selectedEventId: params?.eventId ?? null,
            events: params?.eventId ? 1 : 2,
            bookings: params?.eventId ? 7 : 11,
            impressions: { measured: 42 },
            ticketQuantities: {
              booked_quantity: params?.eventId ? "9" : "13",
              invalid_quantities: 0,
            },
            eventStates: [
              { phase: "UPCOMING", count: params?.eventId ? 1 : 2 },
            ],
            packages: [],
            payments: [],
            unavailableHistory: { bookings_without_time: 0 },
            notice: "Recorded amounts only",
          };
        return [];
      });
    show();
    await screen.findByText("Measured impressions");
    fireEvent.change(screen.getByLabelText("Event statistics"), {
      target: { value: "101" },
    });
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        "workspaces/10/statistics",
        expect.objectContaining({ eventId: 101 }),
      ),
    );
    await screen.findByText("Statistics for Conference");
    expect(
      within(
        screen.getByText("Recorded bookings").closest("article")!,
      ).getByText("7"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByText("Booked ticket quantity").closest("article")!,
      ).getByText("9"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Organization workspace"), {
      target: { value: "20" },
    });
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        "workspaces/20/statistics",
        expect.not.objectContaining({ eventId: 101 }),
      ),
    );
    expect(screen.getByLabelText("Event statistics")).toHaveValue("");
  });
});
