import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { userApi, type UserProfileResponse } from '@/api';

vi.mock('@/api', () => ({
  resolveProfileImageUrl: (url?: string | null) => url ?? undefined,
  userApi: {
    uploadProfileImage: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement object URLs.
  global.URL.createObjectURL = vi.fn(() => 'blob:preview');
  global.URL.revokeObjectURL = vi.fn();
});

const baseProfile: UserProfileResponse = {
  status: true,
  firstName: 'Akila',
  lastName: 'Gimhana',
  name: 'Akila Gimhana',
  email: 'akila@example.com',
  mobile: '+94 77 123 4567',
  role: 'USER',
  authType: 'GOOGLE',
  registeredDate: '2026-01-10',
  options: {
    universities: [{ id: 1, name: 'University of Colombo' }],
    organizations: [
      { id: 3, name: 'VoiceTech Committee', org_type_id: 1, type: 'Club' },
    ],
  },
};

const renderModal = (profile: UserProfileResponse) =>
  render(
    <EditProfileModal
      open
      onClose={vi.fn()}
      profile={profile}
      onSaved={vi.fn()}
    />
  );

describe('EditProfileModal', () => {
  it('shows the base account fields for a USER account', () => {
    renderModal(baseProfile);

    expect(screen.getByLabelText('First name')).toHaveValue('Akila');
    expect(screen.getByLabelText('Last name')).toHaveValue('Gimhana');
    expect(screen.getByLabelText('Email')).toHaveValue('akila@example.com');

    // No role-specific sections for a plain viewer.
    expect(screen.queryByLabelText('Index number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Organization')).not.toBeInTheDocument();
  });

  it('keeps the email read-only for Google accounts', () => {
    renderModal(baseProfile);

    const email = screen.getByLabelText('Email');

    expect(email).toBeDisabled();
    expect(email).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows a masked, disabled password for manual accounts', () => {
    renderModal({ ...baseProfile, authType: 'MANUAL' });

    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('********');
    expect(password).toBeDisabled();
    expect(password).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('shows student fields only for STUDENT accounts', () => {
    renderModal({
      ...baseProfile,
      role: 'STUDENT',
      student: {
        indexNo: '2021/CS/042',
        uniEmail: 'student@cmb.ac.lk',
        universityId: 1,
        universityName: 'University of Colombo',
      },
    });

    expect(screen.getByLabelText('Index number')).toHaveValue('2021/CS/042');
    expect(screen.getByLabelText('University email')).toHaveValue(
      'student@cmb.ac.lk'
    );
    expect(screen.getByLabelText('University')).toHaveValue('1');
    expect(
      screen.getByRole('option', { name: 'University of Colombo' })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Organization')).not.toBeInTheDocument();
  });

  it('shows organizer fields only for ORGANIZER accounts', () => {
    renderModal({
      ...baseProfile,
      role: 'ORGANIZER',
      organization: {
        organizationId: 3,
        organizationName: 'VoiceTech Committee',
        position: 'President',
      },
    });

    expect(screen.getByLabelText('Organization')).toHaveValue('3');
    expect(screen.getByLabelText('Position')).toHaveValue('President');
    expect(screen.queryByLabelText('Index number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('University')).not.toBeInTheDocument();
  });

  it('uploads the chosen image first and saves only editable fields', async () => {
    const uploadedUrl =
      '/goevent/api/user/image/11111111-1111-1111-1111-111111111111.jpg';

    vi.mocked(userApi.uploadProfileImage).mockResolvedValue({
      status: true,
      profileImgUrl: uploadedUrl,
    });
    vi.mocked(userApi.updateProfile).mockResolvedValue({
      ...baseProfile,
      authType: 'MANUAL',
      role: 'STUDENT',
    });

    const onSaved = vi.fn();

    render(
      <EditProfileModal
        open
        onClose={vi.fn()}
        profile={{
          ...baseProfile,
          authType: 'MANUAL',
          role: 'STUDENT',
          student: {
            indexNo: '2021/CS/042',
            uniEmail: 'student@cmb.ac.lk',
            universityId: 1,
            universityName: 'University of Colombo',
          },
        }}
        onSaved={onSaved}
      />
    );

    const file = new File(['image-bytes'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Profile image'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(userApi.updateProfile).toHaveBeenCalledTimes(1));

    expect(userApi.uploadProfileImage).toHaveBeenCalledWith(file);

    const payload = vi.mocked(userApi.updateProfile).mock.calls[0][0];

    expect(payload).toMatchObject({
      firstName: 'Akila',
      lastName: 'Gimhana',
      mobile: '+94 77 123 4567',
      profileImgUrl: uploadedUrl,
      student: {
        indexNo: '2021/CS/042',
        uniEmail: 'student@cmb.ac.lk',
        universityId: 1,
      },
    });

    // The client never sends the read-only or server-owned fields.
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('authType');

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});
