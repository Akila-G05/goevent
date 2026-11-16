"use client";
import { useState } from "react";
import { ChevronDown, FileSpreadsheet } from "lucide-react";
import type { Catalog } from "@/api/coordinator";
export const control = "admin-input";
export const button = "admin-btn";
export const card = "admin-card coordinator-card";
const columnLabels: Record<string, string> = {
  currency: "Currency",
  paid_amount: "Paid amount",
  refunded_state_amount: "Refunded records",
  net_recorded_amount: "Net recorded amount",
  invalid_amounts: "Invalid amounts",
  ticket_id: "Package ID",
  package_name: "Package",
  booked_quantity: "Booked quantity",
  invalid_quantities: "Invalid quantities",
  recorded_booking_amount: "Recorded booking amount",
};
export function DateRange({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (s: string) => void;
  setTo: (s: string) => void;
}) {
  return (
    <>
      <label className="text-xs">
        From
        <input
          className={`${control} block`}
          type="date"
          required
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="text-xs">
        Through
        <input
          className={`${control} block`}
          type="date"
          required
          min={from}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </label>
    </>
  );
}
export function Records({
  title,
  rows,
  defaultOpen = false,
  description,
}: {
  title: string;
  rows: Record<string, string | number | null>[];
  defaultOpen?: boolean;
  description?: string;
}) {
  return (
    <details className="admin-report coordinator-disclosure" open={defaultOpen}>
      <summary>
        <FileSpreadsheet size={16} aria-hidden="true" />
        {title}
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="admin-report-content overflow-auto">
        {description && <p className="admin-sub mb-3">{description}</p>}
        {!rows.length ? (
          <p className="text-sm">No records in this range.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                {Object.keys(rows[0]).map((k) => (
                  <th className="p-2" key={k}>
                    {columnLabels[k] || k.replaceAll("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {Object.entries(r).map(([k, v]) => (
                    <td className="border-t p-2" key={k}>
                      {v ?? "Unavailable"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
export function ApplicationForm({
  catalog,
  busy,
  onApply,
}: {
  catalog?: Catalog;
  busy: boolean;
  onApply: (form: FormData) => Promise<void>;
}) {
  const [existing, setExisting] = useState(true);
  return (
    <form
      className={`${card} admin-form coordinator-application-form`}
      onSubmit={(e) => {
        e.preventDefault();
        void onApply(new FormData(e.currentTarget));
      }}
    >
      <h2 className="font-display text-2xl">Apply for organization access</h2>
      <p className="text-sm">
        Use one login for all organizations. Approval is separate for each
        organization; review times vary. You can also request access to an
        organization you previously worked with.
      </p>
      <label className="flex gap-2">
        <input
          type="checkbox"
          checked={existing}
          onChange={(e) => setExisting(e.target.checked)}
        />
        Select an existing organization
      </label>
      {existing ? (
        <label className="block">
          Organization
          <select
            className={`${control} block w-full`}
            name="organizationId"
            required
          >
            <option value="">Choose organization</option>
            {catalog?.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="block">
            Proposed organization name
            <input
              className={`${control} block w-full`}
              name="proposedName"
              required
              maxLength={45}
            />
          </label>
          <label className="block">
            Organization type
            <select
              className={`${control} block w-full`}
              name="proposedTypeId"
              required
            >
              <option value="">Choose type</option>
              {catalog?.organizationTypes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.type}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {[
        ["position", "Committee position", 45],
        ["contactEmail", "Contact email", 100],
        ["contactPhone", "Contact phone", 30],
      ].map(([name, label, max]) => (
        <label className="block" key={name}>
          {label}
          <input
            className={`${control} block w-full`}
            name={String(name)}
            type={name === "contactEmail" ? "email" : "text"}
            maxLength={Number(max)}
            required
          />
        </label>
      ))}
      <label className="block">
        Explanation
        <textarea
          className={`${control} block w-full`}
          name="explanation"
          required
          maxLength={10000}
          rows={4}
        />
      </label>
      <label className="block">
        Private authorization letter (PDF, JPEG or PNG; up to 10 MB)
        <input
          className={`${control} block w-full`}
          type="file"
          name="proof"
          accept="application/pdf,image/jpeg,image/png"
          required
        />
      </label>
      <p className="text-xs">
        Only you and administrators can download your proof.
      </p>
      <button className={`${button} primary`} disabled={busy || !catalog}>
        {busy ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
