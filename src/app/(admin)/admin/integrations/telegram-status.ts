export type RiderTelegramInfo = {
  linked: boolean;
  telegram_username?: string | null;
  telegram_last_error?: string | null;
  link_expires_at?: string | null;
};

export type TelegramStatusDisplay = {
  status: 'connected' | 'blocked' | 'pending' | 'unlinked';
  label: string;
  badgeClass: string;
  subtext?: string | null;
  actionLabel: string;
};

export function getRiderTelegramStatus(rider: RiderTelegramInfo | null | undefined): TelegramStatusDisplay {
  if (!rider) {
    return {
      status: 'unlinked',
      label: 'Not connected',
      badgeClass: 'badge-ghost',
      actionLabel: 'Copy onboarding link',
    };
  }

  if (rider.linked) {
    return {
      status: 'connected',
      label: 'Connected',
      badgeClass: 'badge-success',
      actionLabel: 'Send test',
    };
  }

  if (rider.telegram_last_error) {
    return {
      status: 'blocked',
      label: 'Blocked / Unreachable',
      badgeClass: 'badge-error',
      subtext: rider.telegram_last_error,
      actionLabel: 'Reconnect link',
    };
  }

  if (rider.link_expires_at) {
    return {
      status: 'pending',
      label: 'Link sent',
      badgeClass: 'badge-warning',
      actionLabel: 'New link',
    };
  }

  return {
    status: 'unlinked',
    label: 'Not connected',
    badgeClass: 'badge-ghost',
    actionLabel: 'Copy onboarding link',
  };
}
