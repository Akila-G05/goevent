import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEventModal } from "@/components/events/create-event-modal";
import { EventContent, Catalog, zonedInstant } from "@/api/coordinator";
const catalog: Catalog = {
  categories: [{ id: 1, name: "Education" }],
  organizations: [],
  organizationTypes: [],
  universities: [{ id: 1, name: "University" }],
};
const content: EventContent = {
  name: "Research day",
  description: "A day of research",
  categoryId: 1,
  audienceId: 2,
  eventLevelId: 1,
  venueName: "Hall",
  venueAddress: "Campus",
  venueCity: "Colombo",
  timezone: "Asia/Colombo",
  startsAt: "2027-06-01T03:30:00Z",
  endsAt: "2027-06-01T04:30:00Z",
  imagePath: "",
  bannerPath: "",
  videoUrl: "",
  confirmationMessage: "Thank you",
  currency: "LKR",
  packages: [],
  universityIds: [],
  minimumAge: 0,
  bookingLimit: 5,
  qrIntended: false,
};
describe("CreateEventModal", () => {
  it("saves the existing form as a draft with UTC instants and explicit options", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <CreateEventModal
        open
        onClose={vi.fn()}
        catalog={catalog}
        initial={content}
        onSave={save}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({
      name: "Research day",
      startsAt: "2027-06-01T03:30:00.000Z",
      endsAt: "2027-06-01T04:30:00.000Z",
      bookingLimit: 5,
      currency: "LKR",
      packages: [],
    });
  });
  it("supports free packages and caps packages at three", () => {
    render(
      <CreateEventModal
        open
        onClose={vi.fn()}
        catalog={catalog}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "2" },
    });
    for (let i = 0; i < 3; i++)
      fireEvent.click(screen.getByRole("button", { name: "Add package" }));
    expect(screen.getByRole("button", { name: "Add package" })).toBeDisabled();
    expect(screen.getAllByLabelText("Price")).toHaveLength(3);
    expect(screen.getAllByLabelText("Price")[0]).toBeDisabled();
  });
  it("requires valid fields and preserves server errors", async () => {
    const save = vi.fn().mockRejectedValue({
      message: "Event changed; refresh before editing",
      status: 409,
    });
    render(
      <CreateEventModal
        open
        onClose={vi.fn()}
        catalog={catalog}
        initial={content}
        onSave={save}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Event changed");
  });
  it("rejects invalid cover content types before preview or upload", () => {
    render(
      <CreateEventModal
        open
        onClose={vi.fn()}
        catalog={catalog}
        onSave={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Cover image \(/), {
      target: {
        files: [new File(["text"], "notes.txt", { type: "text/plain" })],
      },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a JPEG, PNG or WebP image.",
    );
  });
  it("does not offer saving outside a workspace", () => {
    render(<CreateEventModal open onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });
  it("resolves event timezone and rejects daylight saving gaps or ambiguous times", () => {
    expect(zonedInstant("2027-06-01T09:00", "Asia/Colombo")).toBe(
      "2027-06-01T03:30:00.000Z",
    );
    expect(() =>
      zonedInstant("2027-03-14T02:30", "America/New_York"),
    ).toThrow();
    expect(() =>
      zonedInstant("2027-11-07T01:30", "America/New_York"),
    ).toThrow();
  });
});
