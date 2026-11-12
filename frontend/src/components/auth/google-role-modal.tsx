'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Ticket,
  GraduationCap,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Hash,
  Briefcase,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  authApi,
  contentApi,
  UniversityItem,
  OrganizationItem,
  GoogleAuthResponse,
  ManualRegistrationData,
} from '@/api';
import { GoogleDecodedUser } from './google-auth-button';

export interface GoogleRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Google ID token; required for the Google flow, absent for manual signup. */
  idToken?: string;
  googleUser?: GoogleDecodedUser | null;
  /** When present, the modal finishes a manual email/password registration. */
  manualRegistration?: ManualRegistrationData | null;
  onSuccess: (data: GoogleAuthResponse) => void;
}

export type SelectedRole = 'USER' | 'STUDENT' | 'ORGANIZER';

export function GoogleRoleModal({
  isOpen,
  onClose,
  idToken,
  googleUser,
  manualRegistration,
  onSuccess,
}: GoogleRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);

  // Student Fields
  const [indexNo, setIndexNo] = useState('');
  const [uniEmail, setUniEmail] = useState('');
  const [selectedUniId, setSelectedUniId] = useState<string>('');

  // Organizer Fields
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [position, setPosition] = useState('');

  // Dropdown options
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch dropdowns + reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Every open starts from a clean, unselected state
    setSelectedRole(null);
    setIndexNo('');
    setUniEmail('');
    setSelectedUniId('');
    setSelectedOrgId('');
    setPosition('');
    setFormError(null);

    let isMounted = true;
    const fetchContent = async () => {
      setIsLoadingDropdowns(true);
      try {
        const [uniRes, orgRes] = await Promise.allSettled([
          contentApi.getUniversities(),
          contentApi.getOrganizations(),
        ]);

        if (isMounted) {
          if (uniRes.status === 'fulfilled' && uniRes.value?.status) {
            setUniversities(uniRes.value.data || []);
          }
          if (orgRes.status === 'fulfilled' && orgRes.value?.status) {
            setOrganizations(orgRes.value.data || []);
          }
        }
      } catch (err) {
        console.error('Failed to load content options:', err);
      } finally {
        if (isMounted) setIsLoadingDropdowns(false);
      }
    };

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Manual signup shows the name typed into the form; Google uses the decoded profile.
  const displayName = manualRegistration?.fname || googleUser?.name;

  // Validation logic
  const isFormValid = (): boolean => {
    if (selectedRole === null) {
      return false;
    }
    if (selectedRole === 'USER') {
      return true;
    }
    if (selectedRole === 'STUDENT') {
      return (
        indexNo.trim().length > 0 &&
        uniEmail.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uniEmail) &&
        selectedUniId !== ''
      );
    }
    if (selectedRole === 'ORGANIZER') {
      return selectedOrgId !== '' && position.trim().length > 0;
    }
    return false;
  };

  const handleCompleteRegistration = async () => {
    setFormError(null);

    if (selectedRole === null) {
      setFormError('Please select a role to continue.');
      return;
    }

    // Validate fields
    if (selectedRole === 'STUDENT') {
      if (!indexNo.trim()) {
        setFormError('University Registration Number is required.');
        return;
      }
      if (!uniEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uniEmail)) {
        setFormError('Please enter a valid university email address.');
        return;
      }
      if (!selectedUniId) {
        setFormError('Please select your university.');
        return;
      }
    } else if (selectedRole === 'ORGANIZER') {
      if (!selectedOrgId) {
        setFormError('Please select your organization.');
        return;
      }
      if (!position.trim()) {
        setFormError('Please enter your position / role in the organization.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Role data shared by both flows:
      // roleId: 1 for USER, 4 for STUDENT, 2 for ORGANIZER
      const roleFields: Record<string, string> = {};

      if (selectedRole === 'USER') {
        roleFields.roleId = '1';
      } else if (selectedRole === 'STUDENT') {
        roleFields.roleId = '4';
        roleFields.index = indexNo.trim();
        roleFields.uniEmail = uniEmail.trim();
        roleFields.uniId = selectedUniId;
      } else if (selectedRole === 'ORGANIZER') {
        roleFields.roleId = '2';
        roleFields.orgId = selectedOrgId;
        roleFields.position = position.trim();
      }

      const response = manualRegistration
        ? await authApi.registerManual({
            ...manualRegistration,
            roleId: roleFields.roleId,
            index: roleFields.index,
            uniEmail: roleFields.uniEmail,
            uniId: roleFields.uniId,
            orgId: roleFields.orgId,
            position: roleFields.position,
          })
        : await authApi.authenticateGoogle({ idToken: idToken ?? '', ...roleFields });

      if (response.status) {
        onSuccess(response);
      } else {
        setFormError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      // Network/HTTP failures are normalised by the API client.
      console.error('Registration completion error:', err);
      setFormError(err.message || 'Request failed! Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-[#121216] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow ambient effects */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-widest text-red-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step 2 of 2</span>
            </span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide">
            Select Your Role
          </h3>
          <p className="text-xs text-zinc-400">
            {displayName ? (
              <>
                Welcome, <span className="text-white font-medium">{displayName}</span>! Select how you plan to use GoEvent.
              </>
            ) : (
              'Choose your role to finish your GoEvent registration.'
            )}
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-semibold text-zinc-300 block">
            I want to join as:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Student Role */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('STUDENT');
                setFormError(null);
              }}
              className={`p-3 rounded-2xl border text-left flex items-start space-x-2.5 transition-all ${
                selectedRole === 'STUDENT'
                  ? 'border-white bg-white/10 text-white shadow-md'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
              }`}
            >
              <GraduationCap
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  selectedRole === 'STUDENT' ? 'text-red-400' : 'text-zinc-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold block">Student</span>
                <span className="text-[10px] text-zinc-400 block leading-tight">
                  University events & student pricing
                </span>
              </div>
            </button>

            {/* Organizer Role */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('ORGANIZER');
                setFormError(null);
              }}
              className={`p-3 rounded-2xl border text-left flex items-start space-x-2.5 transition-all ${
                selectedRole === 'ORGANIZER'
                  ? 'border-white bg-white/10 text-white shadow-md'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
              }`}
            >
              <Music
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  selectedRole === 'ORGANIZER' ? 'text-red-400' : 'text-zinc-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold block">Organizer</span>
                <span className="text-[10px] text-zinc-400 block leading-tight">
                  Create & manage live events
                </span>
              </div>
            </button>

            {/* User Role */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('USER');
                setFormError(null);
              }}
              className={`p-3 rounded-2xl border text-left flex items-start space-x-2.5 transition-all ${
                selectedRole === 'USER'
                  ? 'border-white bg-white/10 text-white shadow-md'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
              }`}
            >
              <Ticket
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  selectedRole === 'USER' ? 'text-red-400' : 'text-zinc-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold block">User</span>
                <span className="text-[10px] text-zinc-400 block leading-tight">
                  Book tickets & receive QR passes
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Fields Section */}
        <div className="space-y-4 mb-6">
          {selectedRole === null && (
            <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/15 text-xs text-zinc-400 text-center">
              Select a role above to continue.
            </div>
          )}

          {selectedRole === 'USER' && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Standard User account. No additional information is required. Click below to complete your registration!
              </span>
            </div>
          )}

          {selectedRole === 'STUDENT' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* University Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Select University
                </label>
                <div className="relative">
                  <select
                    value={selectedUniId}
                    onChange={(e) => setSelectedUniId(e.target.value)}
                    disabled={isLoadingDropdowns}
                    className="w-full bg-[#18181e] hover:bg-[#1f1f26] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      {isLoadingDropdowns ? 'Loading universities...' : 'Choose your university'}
                    </option>
                    {universities.map((uni) => (
                      <option key={uni.id} value={uni.id} className="bg-[#18181e] text-white">
                        {uni.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Registration Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  University Registration Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={indexNo}
                    onChange={(e) => setIndexNo(e.target.value)}
                    placeholder="e.g. 2021/CS/042 or IT190281"
                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
                  />
                </div>
              </div>

              {/* University Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  University Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={uniEmail}
                    onChange={(e) => setUniEmail(e.target.value)}
                    placeholder="e.g. student@sliit.lk or s12345@univ.ac.lk"
                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedRole === 'ORGANIZER' && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Organization Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Select Organization / Club / Society
                </label>
                <div className="relative">
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    disabled={isLoadingDropdowns}
                    className="w-full bg-[#18181e] hover:bg-[#1f1f26] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      {isLoadingDropdowns ? 'Loading organizations...' : 'Choose your organization'}
                    </option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id} className="bg-[#18181e] text-white">
                        {org.name} ({org.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Position / Designation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. President, Event Lead, Committee Member"
                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/15 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {formError && (
          <div className="mb-5 p-3.5 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center space-x-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleCompleteRegistration}
            disabled={!isFormValid() || isSubmitting}
            className="w-full py-3.5 px-6 rounded-full font-bold text-sm bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2 shadow-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Completing Registration...</span>
              </>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

