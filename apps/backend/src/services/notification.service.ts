import type { INotificationRepository } from '../repositories/interfaces/INotificationRepository';
import type { Notification } from '@rental-trust/database';

export type NotificationService = {
  listForUser(recipientId: string): Promise<Notification[]>;
  markRead(id: string, recipientId: string): Promise<void>;
};

export const makeNotificationService = (repo: INotificationRepository): NotificationService => ({
  listForUser: (recipientId) => repo.findByRecipient(recipientId),

  markRead: async (id, recipientId) => {
    const notifications = await repo.findByRecipient(recipientId);
    const owns = notifications.some((n) => n.id === id);
    if (!owns) return; // silently ignore — don't leak existence
    await repo.markRead(id);
  },
});
