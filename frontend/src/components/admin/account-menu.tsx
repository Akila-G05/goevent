"use client";
import type { AdminSession } from "@/api/admin";
import { AccountMenu } from "@/components/shared/account-menu";

export function AdminAccountMenu(props: {
  actor: AdminSession;
  busy: boolean;
  preview: boolean;
  onSwitch: () => void;
  onLogout: () => void;
}) {
  return <AccountMenu {...props} label="Administrator" />;
}
