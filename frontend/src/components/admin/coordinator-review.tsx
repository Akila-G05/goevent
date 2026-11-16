"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminRecord, adminApi, adminError } from "@/api/admin";
import { contentApi } from "@/api/content";
import { API_PREFIX } from "@/api/routes";
export function CoordinatorReview({
  row,
  busy,
  onSave,
  onCancel,
}: {
  row: AdminRecord;
  busy: boolean;
  onSave: (input: unknown) => Promise<void>;
  onCancel: () => void;
}) {
  const [approve, setApprove] = useState(true),
    [create, setCreate] = useState(false),
    [org, setOrg] = useState(""),
    [reason, setReason] = useState("");
  const organizations = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: contentApi.getOrganizations,
  });
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          approve,
          reason,
          organizationId: org ? Number(org) : null,
          createOrganization: create,
        });
      }}
    >
      <p>
        Applicant: {row.email} · {row.position}
      </p>
      <p>
        Contact: {row.contact_email} · {row.contact_phone}
      </p>
      <p className="whitespace-pre-wrap">{row.explanation || row.msg}</p>
      {row.proof_id ? (
        <a
          className="underline"
          href={`${API_PREFIX}/admin/private-documents/${row.proof_id}`}
        >
          Download private authorization letter
        </a>
      ) : (
        <p role="alert">
          Legacy application has no proof. Approval is blocked until the
          applicant submits a complete application.
        </p>
      )}
      <label>
        Decision
        <select
          className="admin-input"
          value={approve ? "approve" : "reject"}
          onChange={(e) => setApprove(e.target.value === "approve")}
        >
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </label>
      {!row.organization_id && (
        <>
          <p>
            Proposed organization: {row.proposed_name || "Not supplied"} · Type
            ID: {row.proposed_type_id || "Unknown"}
          </p>
          <label>
            Link existing organization
            <select
              className="admin-input"
              value={org}
              disabled={create}
              onChange={(e) => setOrg(e.target.value)}
            >
              <option value="">Select organization</option>
              {organizations.data?.data.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={create}
              onChange={(e) => {
                setCreate(e.target.checked);
                setOrg("");
              }}
            />
            I confirm creation of the proposed organization
          </label>
        </>
      )}
      <label>
        Review reason
        <textarea
          className="admin-input"
          rows={4}
          required
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <footer>
        <button
          type="button"
          className="admin-btn"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="admin-btn primary"
          disabled={
            busy ||
            !reason.trim() ||
            (approve &&
              (!row.proof_id || (!row.organization_id && !org && !create)))
          }
        >
          Confirm review
        </button>
      </footer>
    </form>
  );
}
export function Memberships({
  user,
  busy,
  onRevoke,
}: {
  user: number;
  busy: boolean;
  onRevoke: (id: number, reason: string) => Promise<void>;
}) {
  const query = useQuery({
    queryKey: ["admin", "memberships", user],
    queryFn: () => adminApi.memberships(user),
    retry: false,
  });
  return (
    <section className="mt-5">
      <h3 className="font-semibold">Organization memberships</h3>
      {query.isPending ? (
        <p role="status">Loading memberships…</p>
      ) : query.error ? (
        <p role="alert">{adminError(query.error)}</p>
      ) : !query.data?.length ? (
        <p>No organization memberships.</p>
      ) : (
        query.data.map((m) => (
          <div className="my-3 rounded-xl border p-3" key={m.id}>
            <p>
              {m.name} · {m.position} · {m.access_state}
            </p>
            {m.access_state === "APPROVED" && (
              <button
                className="admin-btn danger"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(
                    "Reason for revoking only this organization membership:",
                  );
                  if (reason) void onRevoke(Number(m.id), reason);
                }}
              >
                Revoke this membership
              </button>
            )}
          </div>
        ))
      )}
    </section>
  );
}
export function ReviewRevision({ id }: { id: number }) {
  const query = useQuery({
    queryKey: ["admin", "event-revision", id],
    queryFn: () => adminApi.detail("event-revisions", id),
    retry: false,
  });
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(String(query.data?.content || "{}")) as Record<
      string,
      unknown
    >;
  } catch {
    /* Display a load failure without executing untrusted content. */
  }
  return (
    <section className="mt-5">
      <h3 className="font-semibold">Submitted revision #{id}</h3>
      {query.isPending ? (
        <p role="status">Loading exact revision…</p>
      ) : query.error ? (
        <p role="alert">{adminError(query.error)}</p>
      ) : (
        <>
          <p>Review state: {query.data?.review_state}</p>
          <pre className="max-w-full overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(content, null, 2)}
          </pre>
          {typeof content.approvalDocumentId === "number" && (
            <a
              className="underline"
              href={`${API_PREFIX}/admin/private-documents/${content.approvalDocumentId}`}
            >
              Download private event approval document
            </a>
          )}
        </>
      )}
    </section>
  );
}

export function AssignOrganization({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (value: unknown) => Promise<void>;
}) {
  const [org, setOrg] = useState(""),
    [reason, setReason] = useState("");
  const organizations = useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: contentApi.getOrganizations,
  });
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ organizationId: Number(org), reason });
      }}
    >
      <p>
        Assign the legacy event only after verifying the publisher and
        organization. This does not grant a membership or publish content.
      </p>
      <label>
        Organization
        <select
          required
          className="admin-input"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
        >
          <option value="">Select organization</option>
          {organizations.data?.data.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <textarea
          required
          maxLength={1000}
          className="admin-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        className="admin-btn primary"
        disabled={busy || !org || !reason.trim()}
      >
        Confirm organization assignment
      </button>
    </form>
  );
}
