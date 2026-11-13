'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  AlertCircle,
  Building2,
  Camera,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import {
  resolveProfileImageUrl,
  userApi,
  type UpdateProfilePayload,
  type UserProfileResponse,
} from '@/api';
import { Dialog } from '@/components/ui/dialog';
import { loading } from '@/lib/loading-store';
import { getErrorMessage, toast } from '@/lib/toast-store';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  mobile: string;
  student: {
    indexNo: string;
    uniEmail: string;
    universityId: string;
  };
  organization: {
    organizationId: string;
    position: string;
  };
}

const buildSchema = (role?: string) =>
  z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1, 'First name is required')
        .max(45, 'First name must be 45 characters or fewer'),
      lastName: z
        .string()
        .trim()
        .min(1, 'Last name is required')
        .max(45, 'Last name must be 45 characters or fewer'),
      mobile: z
        .string()
        .trim()
        .max(15, 'Mobile number must be 15 characters or fewer')
        .refine(
          (value) => value === '' || /^\+?[0-9 ()-]{6,15}$/.test(value),
          'Enter a valid mobile number'
        ),
      student: z.object({
        indexNo: z.string().trim(),
        uniEmail: z.string().trim(),
        universityId: z.string(),
      }),
      organization: z.object({
        organizationId: z.string(),
        position: z.string().trim(),
      }),
    })
    .superRefine((values, ctx) => {
      if (role === 'STUDENT') {
        if (!values.student.indexNo) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['student', 'indexNo'],
            message: 'Index number is required',
          });
        }
        if (!values.student.uniEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['student', 'uniEmail'],
            message: 'University email is required',
          });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.student.uniEmail)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['student', 'uniEmail'],
            message: 'Enter a valid university email',
          });
        }
        if (!values.student.universityId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['student', 'universityId'],
            message: 'Select your university',
          });
        }
      }

      if (role === 'ORGANIZER') {
        if (!values.organization.organizationId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['organization', 'organizationId'],
            message: 'Select your organization',
          });
        }
        if (!values.organization.position) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['organization', 'position'],
            message: 'Position is required',
          });
        }
      }
    });

const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#736e6c]';
const inputClass =
  'w-full rounded-xl border border-[#e0dbd9] bg-[#faf8f7] px-3.5 py-2.5 text-sm text-[#1c1b1b] placeholder-[#a8a4a3] outline-none transition-colors focus:border-[#1c1b1b] focus:bg-white focus:ring-2 focus:ring-[#1c1b1b]/10 disabled:cursor-not-allowed disabled:bg-[#f0eceb] disabled:text-[#8a8583]';
const errorClass = 'mt-1 text-[11px] font-medium text-red-600';

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className={errorClass}>{message}</p>;
}

export interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfileResponse;
  /** Called with the refreshed payload returned by the backend. */
  onSaved: (profile: UserProfileResponse) => void;
}

export function EditProfileModal({ open, onClose, profile, onSaved }: EditProfileModalProps) {
  const role = profile.role;
  const isManual = profile.authType === 'MANUAL';
  const isStudent = role === 'STUDENT';
  const isOrganizer = role === 'ORGANIZER';

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = useMemo(() => buildSchema(role), [role]);

  const defaultValues = useMemo<ProfileFormValues>(
    () => ({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      mobile: profile.mobile ?? '',
      student: {
        indexNo: profile.student?.indexNo ?? '',
        uniEmail: profile.student?.uniEmail ?? '',
        universityId: profile.student?.universityId
          ? String(profile.student.universityId)
          : '',
      },
      organization: {
        organizationId: profile.organization?.organizationId
          ? String(profile.organization.organizationId)
          : '',
        position: profile.organization?.position ?? '',
      },
    }),
    [profile]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  // Reset on the closed -> open transition only. Resetting whenever `profile`
  // changes would wipe in-progress edits if React Query refetches in the
  // background (the profile query has no stale time).
  const wasOpenRef = useRef(open);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) {
      return;
    }

    reset(defaultValues);
    setImageFile(null);
    setPreviewUrl(null);
    setFormError(null);
  }, [open, reset, defaultValues]);

  // Release the local preview object URL when it is replaced or the modal closes.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.info('Choose a JPEG, PNG or WebP image.');
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.info('Image must be 2 MB or smaller.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    loading.open();

    try {
      let uploadedImagePath: string | undefined;

      if (imageFile) {
        const uploaded = await userApi.uploadProfileImage(imageFile);

        if (!uploaded.status || !uploaded.profileImgUrl) {
          throw { message: uploaded.message || 'Image upload failed' };
        }

        uploadedImagePath = uploaded.profileImgUrl;
      }

      const payload: UpdateProfilePayload = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        mobile: values.mobile.trim(),
      };

      // Only send the image when it changed; the backend keeps the stored one
      // otherwise, and never re-validates a legacy URL the client didn't touch.
      if (uploadedImagePath) {
        payload.profileImgUrl = uploadedImagePath;
      }

      if (isStudent) {
        payload.student = {
          indexNo: values.student.indexNo.trim(),
          uniEmail: values.student.uniEmail.trim(),
          universityId: Number(values.student.universityId),
        };
      }

      if (isOrganizer) {
        payload.organization = {
          organizationId: Number(values.organization.organizationId),
          position: values.organization.position.trim(),
        };
      }

      const updated = await userApi.updateProfile(payload);

      if (!updated.status) {
        const message = updated.message || 'Could not save your profile.';
        setFormError(message);
        toast.info(message);
        return;
      }

      toast.success('Profile updated');
      onSaved(updated);
      onClose();
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error(message, { title: 'Could not save profile' });
    } finally {
      loading.close(500);
    }
  });

  const avatarSrc = previewUrl ?? resolveProfileImageUrl(profile.profileImgUrl);
  const initials =
    `${profile.firstName ?? ''} ${profile.lastName ?? ''}`
      .trim()
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'GO';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="Update your account details. Changes are saved to your GoEvent profile."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full bg-[#f0eceb] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#1c1b1b] transition-colors hover:bg-[#e4dfde] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-full bg-[#1c1b1b] px-6 py-2.5 text-xs font-bold tracking-wider text-white transition-colors hover:bg-[#333131] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </>
      }
    >
      <form id="edit-profile-form" onSubmit={onSubmit} noValidate className="space-y-6">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Photo */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-[#1c1b1b]" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Profile image</h3>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#f0eceb] bg-[#1c1b1b] text-2xl font-display font-bold tracking-widest text-white">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </div>

            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                id="profile-image"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                aria-label="Profile image"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-[#f0eceb] px-4 py-2 text-xs font-semibold text-[#1c1b1b] transition-colors hover:bg-[#e4dfde]"
              >
                Change photo
              </button>
              <p className="text-[11px] text-[#918c8a]">JPEG, PNG or WebP · up to 2 MB</p>
            </div>
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-[#1c1b1b]" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Account</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eceb] px-3 py-1 text-[11px] font-semibold text-[#1c1b1b]">
              {isManual ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {isManual ? 'Email & password' : 'Google account'}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#1c1b1b] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
              {role ?? 'USER'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first-name" className={labelClass}>
                First name
              </label>
              <input
                id="profile-first-name"
                type="text"
                autoComplete="given-name"
                className={inputClass}
                {...register('firstName')}
              />
              <FieldError message={errors.firstName?.message} />
            </div>

            <div>
              <label htmlFor="profile-last-name" className={labelClass}>
                Last name
              </label>
              <input
                id="profile-last-name"
                type="text"
                autoComplete="family-name"
                className={inputClass}
                {...register('lastName')}
              />
              <FieldError message={errors.lastName?.message} />
            </div>

            <div>
              <label htmlFor="profile-email" className={labelClass}>
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a4a3]" />
                <input
                  id="profile-email"
                  type="email"
                  value={profile.email ?? ''}
                  readOnly
                  disabled
                  aria-describedby="profile-email-note"
                  className={`${inputClass} pl-10`}
                />
              </div>
              <p id="profile-email-note" className="mt-1 text-[11px] text-[#918c8a]">
                Email can&apos;t be changed.
              </p>
            </div>

            <div>
              <label htmlFor="profile-mobile" className={labelClass}>
                Mobile number
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a4a3]" />
                <input
                  id="profile-mobile"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. +94 77 123 4567"
                  className={`${inputClass} pl-10`}
                  {...register('mobile')}
                />
              </div>
              <FieldError message={errors.mobile?.message} />
            </div>
          </div>

          {isManual && (
            <div>
              <label htmlFor="profile-password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a4a3]" />
                <input
                  id="profile-password"
                  type="password"
                  value="********"
                  readOnly
                  disabled
                  aria-describedby="profile-password-note"
                  className={`${inputClass} pl-10`}
                />
              </div>
              <p id="profile-password-note" className="mt-1 text-[11px] text-[#918c8a]">
                Passwords can&apos;t be changed from this screen.
              </p>
            </div>
          )}
        </section>

        {/* Student */}
        {isStudent && (
          <section className="space-y-4 border-t border-[#f0eceb] pt-5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#1c1b1b]" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Student details</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-index-no" className={labelClass}>
                  Index number
                </label>
                <input
                  id="profile-index-no"
                  type="text"
                  placeholder="e.g. 2021/CS/042"
                  className={inputClass}
                  {...register('student.indexNo')}
                />
                <FieldError message={errors.student?.indexNo?.message} />
              </div>

              <div>
                <label htmlFor="profile-uni-email" className={labelClass}>
                  University email
                </label>
                <input
                  id="profile-uni-email"
                  type="email"
                  placeholder="e.g. student@univ.ac.lk"
                  className={inputClass}
                  {...register('student.uniEmail')}
                />
                <FieldError message={errors.student?.uniEmail?.message} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="profile-university" className={labelClass}>
                  University
                </label>
                <select
                  id="profile-university"
                  className={inputClass}
                  {...register('student.universityId')}
                >
                  <option value="">Select your university</option>
                  {profile.options?.universities?.map((university) => (
                    <option key={university.id} value={university.id}>
                      {university.name}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.student?.universityId?.message} />
              </div>
            </div>
          </section>
        )}

        {/* Organizer */}
        {isOrganizer && (
          <section className="space-y-4 border-t border-[#f0eceb] pt-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#1c1b1b]" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Organizer details</h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-organization" className={labelClass}>
                  Organization
                </label>
                <select
                  id="profile-organization"
                  className={inputClass}
                  {...register('organization.organizationId')}
                >
                  <option value="">Select your organization</option>
                  {profile.options?.organizations?.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                      {organization.type ? ` (${organization.type})` : ''}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.organization?.organizationId?.message} />
              </div>

              <div>
                <label htmlFor="profile-position" className={labelClass}>
                  Position
                </label>
                <input
                  id="profile-position"
                  type="text"
                  placeholder="e.g. President, Event Lead"
                  className={inputClass}
                  {...register('organization.position')}
                />
                <FieldError message={errors.organization?.position?.message} />
              </div>
            </div>
          </section>
        )}
      </form>
    </Dialog>
  );
}
