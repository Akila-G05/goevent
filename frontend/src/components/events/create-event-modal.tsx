"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog } from "@/components/ui/dialog";
import {
  coordinatorApi,
  EventContent,
  EventPackage,
  Catalog,
  eventLocal,
  zonedInstant,
} from "@/api/coordinator";
import { adminError } from "@/api/admin";
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(20000),
  categoryId: z.coerce.number().int().positive(),
  audienceId: z.coerce.number().int().min(1).max(3),
  eventLevelId: z.coerce.number().int().min(1).max(3),
  venueName: z.string().trim().min(1).max(45),
  venueAddress: z.string().max(150),
  venueCity: z.string().trim().min(1).max(45),
  timezone: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  videoUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]),
  confirmationMessage: z.string().max(2000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  minimumAge: z.coerce.number().int().min(0).max(120),
  bookingLimit: z.coerce.number().int().min(1).max(100),
  qrIntended: z.boolean(),
  universityIds: z.array(z.string()),
});
type Fields = z.infer<typeof schema>;
export interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  catalog?: Catalog;
  initial?: EventContent;
  onSave?: (content: EventContent) => Promise<void>;
}
const input =
  "w-full rounded-xl border border-[#e0dbd9] bg-[#faf8f7] px-3 py-2 text-sm focus:ring-2 focus:ring-black/20";
export function CreateEventModal({
  open,
  onClose,
  catalog,
  initial,
  onSave,
}: CreateEventModalProps) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [packages, setPackages] = useState<EventPackage[]>(
    initial?.packages || [],
  );
  const [cover, setCover] = useState<File>(),
    [banner, setBanner] = useState<File>(),
    [proof, setProof] = useState<File>();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...initial,
      name: initial?.name || "",
      description: initial?.description || "",
      categoryId: initial?.categoryId || 0,
      audienceId: initial?.audienceId || 2,
      eventLevelId: initial?.eventLevelId || 1,
      venueName: initial?.venueName || "",
      venueAddress: initial?.venueAddress || "",
      venueCity: initial?.venueCity || "",
      timezone: initial?.timezone || "Asia/Colombo",
      startsAt: initial ? eventLocal(initial.startsAt, initial.timezone) : "",
      endsAt: initial ? eventLocal(initial.endsAt, initial.timezone) : "",
      videoUrl: initial?.videoUrl || "",
      confirmationMessage: initial?.confirmationMessage || "",
      currency: initial?.currency || "LKR",
      minimumAge: initial?.minimumAge || 0,
      bookingLimit: initial?.bookingLimit || 5,
      qrIntended: initial?.qrIntended || false,
      universityIds: initial?.universityIds.map(String) || [],
    },
  });
  const level = Number(watch("eventLevelId")),
    timezone = watch("timezone");
  function tier(index: number, patch: Partial<EventPackage>) {
    setPackages((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function selectImage(file: File | undefined, kind: "cover" | "banner") {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > (kind === "cover" ? 5 : 8) * 1024 * 1024) {
      setError(`Image must be ${kind === "cover" ? 5 : 8} MB or smaller.`);
      return;
    }
    setError("");
    if (kind === "cover") setCover(file);
    else setBanner(file);
  }
  async function save(fields: Fields) {
    if (!onSave) {
      setError("Open an approved organization workspace to save an event.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const startsAt = zonedInstant(fields.startsAt, fields.timezone),
        endsAt = zonedInstant(fields.endsAt, fields.timezone);
      if (endsAt <= startsAt) throw new Error("End must follow start.");
      if (level !== 1 && (!packages.length || packages.length > 3))
        throw new Error("Add one to three packages.");
      const converted =
        level === 1
          ? []
          : packages.map((p) => ({
              ...p,
              price: level === 2 ? "0" : p.price,
              saleStartsAt: zonedInstant(
                p.saleStartsAt.slice(0, 16),
                fields.timezone,
              ),
              saleEndsAt: zonedInstant(
                p.saleEndsAt.slice(0, 16),
                fields.timezone,
              ),
            }));
      const approvalDocumentId = proof
        ? await coordinatorApi.document(proof, "EVENT")
        : initial?.approvalDocumentId;
      const imagePath = cover
        ? await coordinatorApi.image(cover, "event")
        : initial?.imagePath || "";
      const bannerPath = banner
        ? await coordinatorApi.image(banner, "banner")
        : initial?.bannerPath || "";
      await onSave({
        ...fields,
        universityIds: fields.universityIds.map(Number),
        startsAt,
        endsAt,
        packages: converted,
        approvalDocumentId,
        imagePath,
        bannerPath,
      });
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }
  const field = (name: keyof Fields, label: string, type = "text") => (
    <label className="block space-y-1" key={name}>
      <span className="text-xs font-semibold">{label}</span>
      {name === "description" || name === "confirmationMessage" ? (
        <textarea className={input} rows={3} {...register(name)} />
      ) : (
        <input className={input} type={type} {...register(name)} />
      )}
      <span
        role={errors[name] ? "alert" : undefined}
        className="text-xs text-red-700"
      >
        {errors[name]?.message}
      </span>
    </label>
  );
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={initial ? "Edit proposed revision" : "Create event"}
      description="Save a draft, then submit it for administrator review. Publication always requires approval."
      panelClassName="max-w-3xl"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-full border px-4 py-2"
          >
            Cancel
          </button>
          <button
            form="create-event-form"
            disabled={busy || !onSave}
            className="rounded-full bg-black px-5 py-2 text-white"
          >
            {busy ? "Saving…" : "Save draft"}
          </button>
        </>
      }
    >
      <form
        id="create-event-form"
        className="space-y-5"
        onSubmit={handleSubmit(save)}
      >
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {field("name", "Event name")}
        {field("description", "Description")}
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            Category
            <select className={input} {...register("categoryId")}>
              <option value="0">Select category</option>
              {catalog?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <span role="alert">Choose a category.</span>}
          </label>
          <label>
            Audience
            <select className={input} {...register("audienceId")}>
              <option value="1">University</option>
              <option value="2">Public</option>
              <option value="3">Both</option>
            </select>
          </label>
        </div>
        <label className="block">
          Event type
          <select className={input} {...register("eventLevelId")}>
            <option value="1">Listing only</option>
            <option value="2">Free</option>
            <option value="3">Paid</option>
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("venueName", "Venue name")}
          {field("venueCity", "City")}
          {field("venueAddress", "Venue address")}
          {field("timezone", "Event timezone (IANA)")}
          {field("startsAt", "Starts at", "datetime-local")}
          {field("endsAt", "Ends at", "datetime-local")}
        </div>
        <p className="text-xs text-gray-600">
          All schedule and package times use {timezone}. Invalid or ambiguous
          daylight saving times must be corrected.
        </p>
        <label className="block">
          Cover image (JPEG, PNG, WebP; 5 MB)
          <input
            className={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => selectImage(e.target.files?.[0], "cover")}
          />
        </label>
        <ImagePreview
          file={cover}
          path={initial?.imagePath}
          label="Cover image preview"
        />
        <label className="block">
          Banner image (JPEG, PNG, WebP; 8 MB)
          <input
            className={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => selectImage(e.target.files?.[0], "banner")}
          />
        </label>
        <ImagePreview
          file={banner}
          path={initial?.bannerPath}
          label="Banner image preview"
        />
        {field("videoUrl", "External video URL (HTTPS)")}
        <label className="block">
          Private event approval document (required to submit; PDF, JPEG, PNG;
          10 MB)
          <input
            className={input}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => setProof(e.target.files?.[0])}
          />
          {initial?.approvalDocumentId && (
            <span className="text-xs">
              Existing private proof retained unless replaced.
            </span>
          )}
        </label>
        {field("confirmationMessage", "Booking confirmation message")}
        <fieldset className="rounded-xl border p-4">
          <legend>Audience and booking configuration</legend>
          <label>
            Eligible universities
            <select multiple className={input} {...register("universityIds")}>
              {catalog?.universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("minimumAge", "Minimum age", "number")}
            {field("bookingLimit", "Per-user booking limit", "number")}
            {field("currency", "Currency")}
          </div>
          <label className="flex gap-2 pt-3">
            <input type="checkbox" {...register("qrIntended")} />
            QR tickets intended
          </label>
          <p className="pt-2 text-xs text-gray-600">
            These settings are recorded configuration. Checkout, eligibility
            enforcement and QR issuance are separate ticketing work.
          </p>
        </fieldset>
        {level !== 1 && (
          <section className="space-y-4">
            <h3 className="font-semibold">Ticket packages (up to three)</h3>
            {packages.map((p, i) => (
              <fieldset key={i} className="space-y-3 rounded-xl border p-4">
                <legend>Package {i + 1}</legend>
                <label className="block">
                  Package name
                  <input
                    className={input}
                    value={p.name}
                    maxLength={100}
                    required
                    onChange={(e) => tier(i, { name: e.target.value })}
                  />
                </label>
                <label className="block">
                  Benefits
                  <textarea
                    className={input}
                    required
                    maxLength={2000}
                    value={p.benefits}
                    onChange={(e) => tier(i, { benefits: e.target.value })}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    Quantity
                    <input
                      type="number"
                      className={input}
                      min={1}
                      max={1000000}
                      required
                      value={p.quantity}
                      onChange={(e) =>
                        tier(i, { quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Price
                    <input
                      className={input}
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      disabled={level === 2}
                      value={level === 2 ? "0" : p.price}
                      onChange={(e) => tier(i, { price: e.target.value })}
                    />
                  </label>
                  <label>
                    Sale starts at
                    <input
                      className={input}
                      type="datetime-local"
                      required
                      value={p.saleStartsAt}
                      onChange={(e) =>
                        tier(i, { saleStartsAt: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Sale ends at
                    <input
                      className={input}
                      type="datetime-local"
                      required
                      value={p.saleEndsAt}
                      onChange={(e) => tier(i, { saleEndsAt: e.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Package university eligibility
                  <select
                    multiple
                    className={input}
                    value={p.universityIds.map(String)}
                    onChange={(e) =>
                      tier(i, {
                        universityIds: Array.from(
                          e.target.selectedOptions,
                          (o) => Number(o.value),
                        ),
                      })
                    }
                  >
                    {catalog?.universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPackages((rows) => rows.filter((_, n) => n !== i))
                  }
                >
                  Remove package {i + 1}
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              disabled={packages.length >= 3}
              onClick={() =>
                setPackages((rows) => [
                  ...rows,
                  {
                    name: "",
                    benefits: "",
                    quantity: 1,
                    price: "0",
                    saleStartsAt: "",
                    saleEndsAt: "",
                    universityIds: [],
                  },
                ])
              }
              className="rounded-full border px-4 py-2"
            >
              Add package
            </button>
          </section>
        )}
      </form>
    </Dialog>
  );
}
export default CreateEventModal;

function ImagePreview({
  file,
  path,
  label,
}: {
  file?: File;
  path?: string;
  label: string;
}) {
  const [preview, setPreview] = useState(path);
  useEffect(() => {
    if (!file) {
      setPreview(path);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, path]);
  if (!preview) return null;
  // Public uploads have dynamic local/CDN URLs; the preview also accepts temporary blob URLs.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={preview}
      alt={label}
      className="max-h-48 w-full rounded-xl object-cover"
    />
  );
}
